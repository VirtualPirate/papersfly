import {
  Suspense,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { SchemaForm } from "./forms/SchemaForm";
import { documents, defaultDocument } from "./documents/registry";
import { downloadResumePdf } from "./pdf/download";
import { theme } from "./theme/theme";
import { collectResumeText, unsupportedChars } from "./fonts/coverage";

// The page at true physical size, in CSS px (96dpi): pt * 96 / 72.
const PX = 96 / 72;
const PAGE_W_PX = theme.page.width * PX;
const PAGE_H_PX = theme.page.height * PX;

export function App() {
  const [docId, setDocId] = useState<string>(defaultDocument.id);
  const doc = useMemo(
    () => documents.find((d) => d.id === docId) ?? defaultDocument,
    [docId],
  );
  const [data, setData] = useState<any>(defaultDocument.defaultData);
  const template = doc.templates[0];
  const Preview = template.Preview; // lazy — rendered behind <Suspense> below

  const handleDocChange = (id: string) => {
    const next = documents.find((d) => d.id === id) ?? defaultDocument;
    setDocId(next.id);
    setData(next.defaultData); // load that type's seed content
  };

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
    { data: any; Comp: ComponentType<{ data: any }> } | null
  >(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        const avail = stage.clientWidth - 56; // minus the .preview padding
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
        await downloadResumePdf(host, "resume.pdf");
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
      setCapture({ data, Comp }); // freeze content + mount the offscreen copy
    } catch (err) {
      console.error("Template preload failed:", err);
      setError("Could not generate the PDF. Please try again.");
      setDownloading(false);
    }
  };
  const handleReset = () => setData(doc.defaultData);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>Vector Résumé Builder</h1>
          <span className="tag">live preview · true-vector PDF · 100% offline</span>
        </div>
        <div className="topbar-actions">
          <select
            aria-label="Document type"
            className="doc-select"
            value={doc.id}
            onChange={(e) => handleDocChange(e.target.value)}
          >
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
          <button className="btn btn-ghost" onClick={handleReset}>
            Reset sample
          </button>
          <button className="btn btn-primary" onClick={handleDownload} disabled={downloading}>
            {downloading ? "Generating…" : "↓ Download PDF"}
          </button>
        </div>
      </header>

      {error && (
        <div className="warning-bar" role="alert">
          <span>
            <strong>PDF error:</strong> {error}
          </span>
          <button className="bar-dismiss" onClick={() => setError(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      {unsupported.length > 0 && (
        <div className="warning-bar" role="alert">
          <span>
            <strong>Heads up:</strong> this template's font can't render{" "}
            {unsupported.slice(0, 12).map((c) => `"${c}"`).join(", ")}
            {unsupported.length > 12 ? " …" : ""}. Those characters will be left out of the PDF.
          </span>
        </div>
      )}

      <div className="workspace">
        <div className="editor">
          <SchemaForm schema={doc.schema} data={data} onChange={setData} />
        </div>

        <div className="preview" ref={stageRef}>
          <div className="page-frame" style={{ width: frame.w, height: frame.h }}>
            <div
              className="page-scaler"
              ref={pageRef}
              style={{ transform: `scale(${scale})`, width: PAGE_W_PX }}
            >
              <Suspense fallback={<div className="template-loading" aria-hidden />}>
                <Preview data={data} />
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
          <capture.Comp data={capture.data} />
        </div>
      )}
    </div>
  );
}
