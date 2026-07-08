import {
  Suspense,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { SchemaForm } from "./forms/SchemaForm";
import { documents, defaultDocument } from "./documents/registry";
import { theme } from "./theme/theme";
import { collectResumeText, unsupportedChars } from "./fonts/coverage";
import { setFontOverride, type FontOverrides } from "./fonts/overrides";
import { fontStack, type FontId } from "./fonts/library";
import { VariantPicker } from "./forms/VariantPicker";
import { resolveVariantFontIds, SPACING_PRESETS, SIZE_PRESETS, type Variant } from "./theme/variants";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ThemeToggle } from "@/components/site/ThemeToggle";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChevronDown, CircleAlert, CircleCheck, TriangleAlert, Upload, X } from "lucide-react";
import { ImportDialog } from "./import/ImportDialog";

// The page at true physical size, in CSS px (96dpi): pt * 96 / 72.
const PX = 96 / 72;
const PAGE_W_PX = theme.page.width * PX;
const PAGE_H_PX = theme.page.height * PX;

interface AppProps {
  /** Document type id from the route; falls back to the default document. */
  docId?: string;
  /** Template id from the route; falls back to the document's first template. */
  templateId?: string;
}

export function App({ docId, templateId }: AppProps) {
  const doc = useMemo(
    () => documents.find((d) => d.id === docId) ?? defaultDocument,
    [docId],
  );
  const template = useMemo(
    () => doc.templates.find((t) => t.id === templateId) ?? doc.templates[0],
    [doc, templateId],
  );
  const [data, setData] = useState<any>(() => doc.defaultData);
  const [fontOverrides, setFontOverrides] = useState<FontOverrides>({});
  const [variant, setVariant] = useState<Variant>(() => template.variants.default);
  // The `.app` element — the Style popover portals into it so the chrome-scoped
  // reset in globals.css reaches the popover's buttons (Preflight is omitted).
  const [appEl, setAppEl] = useState<HTMLDivElement | null>(null);
  // On narrow screens the editor and preview can't sit side by side, so a
  // segmented toggle picks which one is visible (see `.view-toggle` in index.css).
  const [view, setView] = useState<"edit" | "preview">("edit");
  const handleFontChange = (path: string, id: FontId | null) =>
    setFontOverrides((prev) => setFontOverride(prev, path, id));
  const Preview = template.Preview; // lazy — rendered behind <Suspense> below

  // The current selection, for the Style trigger's swatch + font-name label.
  const activeColor =
    template.variants.colors.find((c) => c.id === variant.colorId) ?? template.variants.colors[0];
  const activeFont =
    template.variants.fonts.find((f) => f.id === variant.fontId) ?? template.variants.fonts[0];

  // Characters the embedded subset fonts cannot render (e.g. CJK, Cyrillic).
  const unsupported = useMemo(() => unsupportedChars(collectResumeText(data)), [data]);

  // Scale the full-size page to fit the preview column.
  const stageRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [frame, setFrame] = useState({ w: PAGE_W_PX, h: PAGE_H_PX });

  // PDF export. The capture copy is mounted ONLY during a download and is fed a
  // FROZEN snapshot of the data so typing mid-export can't change what
  // doc.html() is measuring.
  const pdfSourceRef = useRef<HTMLDivElement>(null);
  // The capture copy needs BOTH a frozen data snapshot AND the resolved
  // (non-lazy) template component, so it renders synchronously the instant it
  // mounts. A still-suspended lazy component would produce no `.resume-page`
  // for the layout effect below to find, silently aborting the export.
  const [capture, setCapture] = useState<
    {
      data: any;
      fontOverrides: FontOverrides;
      variant: Variant;
      Comp: ComponentType<{ data: any; fontOverrides?: FontOverrides; variant?: Variant }>;
    } | null
  >(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  // Auto-dismiss the import success banner.
  useEffect(() => {
    if (!notice) return;
    const t = window.setTimeout(() => setNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [notice]);

  const handleImport = (next: any, summary: string) => {
    setData(next);
    setFontOverrides({}); // overrides key off replaced item ids; variant is preserved
    setImportOpen(false);
    setNotice(summary);
  };

  // Subscribe ONCE on mount. The observer watches the stage (width) and the
  // page (content height), so data edits still update the frame without
  // re-subscribing. A rAF + equality guard prevents the classic
  // ResizeObserver/scrollbar feedback loop.
  useLayoutEffect(() => {
    const stage = stageRef.current;
    const page = pageRef.current;
    if (!stage || !page) return;

    let raf = 0;
    const recompute = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        // Subtract the stage's actual horizontal padding (differs by breakpoint)
        // rather than a hardcoded value, so the page fills the available width.
        const cs = getComputedStyle(stage);
        const padX = (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
        const avail = stage.clientWidth - padX;
        const s = Math.min(1, Math.max(0.3, avail / PAGE_W_PX));
        const w = PAGE_W_PX * s;
        const h = page.offsetHeight * s;
        setScale((prev) => (Math.abs(prev - s) < 0.0005 ? prev : s));
        setFrame((prev) =>
          Math.abs(prev.w - w) < 0.5 && Math.abs(prev.h - h) < 0.5 ? prev : { w, h },
        );
      });
    };

    recompute();
    const ro = new ResizeObserver(recompute);
    ro.observe(stage);
    ro.observe(page);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  // Once the frozen capture copy has mounted and laid out, export it then unmount.
  useLayoutEffect(() => {
    if (!capture) return;
    const host = pdfSourceRef.current?.querySelector<HTMLElement>(".resume-page");
    if (!host) {
      setDownloading(false);
      setCapture(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { downloadResumePdf } = await import("./pdf/download");
        await downloadResumePdf(host, "resume.pdf", capture.fontOverrides, resolveVariantFontIds(capture.variant));
      } catch (err) {
        console.error("PDF generation failed:", err);
        if (!cancelled) setError("Could not generate the PDF. Please try again.");
      } finally {
        if (!cancelled) {
          setDownloading(false);
          setCapture(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [capture]);

  const handleDownload = async () => {
    if (downloading) return;
    setError(null);
    setDownloading(true);
    try {
      // Resolve the template's chunk to the concrete component FIRST, so the
      // offscreen capture renders synchronously and `.resume-page` exists the
      // moment the layout effect above reads it.
      const Comp = await template.preload();
      setCapture({ data, fontOverrides, variant, Comp }); // freeze content + fonts + variant + mount the offscreen copy
    } catch (err) {
      console.error("Template preload failed:", err);
      setError("Could not generate the PDF. Please try again.");
      setDownloading(false);
    }
  };
  const handleReset = () => {
    setData(doc.defaultData);
    setFontOverrides({});
    setVariant(template.variants.default);
  };

  return (
    <div className="app" ref={setAppEl}>
      <header className="flex shrink-0 items-center justify-between gap-2 border-b bg-background px-3 py-3 sm:gap-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <a
            href="/create"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground"
            aria-label="Templates"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span className="hidden sm:inline">Templates</span>
          </a>
          <span className="h-5 w-px bg-border" aria-hidden="true" />
          <h1 data-testid="builder-title" className="truncate text-sm font-bold tracking-tight">
            {doc.name}
            <span className="hidden font-medium text-muted-foreground sm:inline"> · {template.name}</span>
          </h1>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          <ThemeToggle />
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" aria-label="Variants" className="gap-2">
                <span
                  className="size-3.5 rounded-full ring-1 ring-black/15"
                  style={{ backgroundColor: activeColor.accent }}
                  aria-hidden
                />
                <span className="hidden sm:inline" style={{ fontFamily: fontStack(activeFont.display) }}>{activeFont.name}</span>
                <ChevronDown className="size-3.5 text-muted-foreground" aria-hidden />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-72" container={appEl}>
              <VariantPicker
                colors={template.variants.colors}
                fonts={template.variants.fonts}
                spacings={SPACING_PRESETS}
                sizes={SIZE_PRESETS}
                value={variant}
                onChange={setVariant}
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
            <Upload className="size-4" aria-hidden />
            <span className="hidden sm:inline">Import</span>
          </Button>
          <Button variant="ghost" className="hidden sm:inline-flex" onClick={handleReset}>
            Reset sample
          </Button>
          <Button onClick={handleDownload} disabled={downloading}>
            {downloading ? "Generating…" : (
              <>
                ↓ <span className="hidden sm:inline">Download&nbsp;</span>PDF
              </>
            )}
          </Button>
        </div>
      </header>

      {error && (
        <Alert variant="destructive" className="shrink-0 rounded-none border-x-0 border-t-0">
          <CircleAlert />
          <AlertTitle>PDF error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 size-7"
            onClick={() => setError(null)}
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </Button>
        </Alert>
      )}

      {notice && (
        <Alert className="shrink-0 rounded-none border-x-0 border-t-0">
          <CircleCheck />
          <AlertTitle>Imported</AlertTitle>
          <AlertDescription>Loaded {notice}.</AlertDescription>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2 top-2 size-7"
            onClick={() => setNotice(null)}
            aria-label="Dismiss"
          >
            <X className="size-4" />
          </Button>
        </Alert>
      )}

      {unsupported.length > 0 && (
        <Alert className="shrink-0 rounded-none border-x-0 border-t-0">
          <TriangleAlert />
          <AlertTitle>Heads up</AlertTitle>
          <AlertDescription>
            This template's font can't render{" "}
            {unsupported.slice(0, 12).map((c) => `"${c}"`).join(", ")}
            {unsupported.length > 12 ? " …" : ""}. Those characters will be left out of the PDF.
          </AlertDescription>
        </Alert>
      )}

      <div className="view-toggle" role="tablist" aria-label="Editor view">
        <button
          type="button"
          role="tab"
          aria-selected={view === "edit"}
          onClick={() => setView("edit")}
        >
          Edit
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === "preview"}
          onClick={() => setView("preview")}
        >
          Preview
        </button>
      </div>

      <div className="workspace" data-view={view}>
        <div className="editor">
          <SchemaForm
            schema={template.schema}
            data={data}
            onChange={setData}
            fontOverrides={fontOverrides}
            onFontChange={handleFontChange}
          />
        </div>

        <div className="preview" ref={stageRef}>
          <div className="page-frame" style={{ width: frame.w, height: frame.h }}>
            <div
              className="page-scaler"
              ref={pageRef}
              style={{ transform: `scale(${scale})`, width: PAGE_W_PX }}
            >
              <Suspense fallback={<div className="template-loading" aria-hidden />}>
                <Preview data={data} fontOverrides={fontOverrides} variant={variant} />
              </Suspense>
            </div>
          </div>
        </div>
      </div>

      {/* Offscreen, true-size capture source for doc.html(). Mounted only during
          a download and fed a frozen snapshot. Renders the preloaded concrete
          component (not the lazy one) so `.resume-page` exists synchronously. */}
      {capture && (
        <div
          ref={pdfSourceRef}
          className="pdf-capture"
          aria-hidden
          style={{
            position: "fixed",
            left: "-10000px",
            top: 0,
            width: PAGE_W_PX,
            pointerEvents: "none",
          }}
        >
          <capture.Comp data={capture.data} fontOverrides={capture.fontOverrides} variant={capture.variant} />
        </div>
      )}

      <ImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        doc={doc}
        currentData={data}
        container={appEl}
        onImport={handleImport}
      />
    </div>
  );
}
