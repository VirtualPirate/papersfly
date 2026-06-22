import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { sampleResume, type ResumeData } from "./data/resume";
import { EditorForm } from "./components/EditorForm";
import { defaultTemplate } from "./templates/registry";
import { downloadResumePdf } from "./pdf/download";
import { theme } from "./theme/theme";
import { collectResumeText, unsupportedChars } from "./fonts/coverage";

// The page at true physical size, in CSS px (96dpi): pt * 96 / 72.
const PX = 96 / 72;
const PAGE_W_PX = theme.page.width * PX;

export function App() {
  const [data, setData] = useState<ResumeData>(sampleResume);
  const template = defaultTemplate;
  const Preview = template.Preview;

  // Characters the embedded subset fonts cannot render (e.g. CJK, Cyrillic).
  const unsupported = useMemo(() => unsupportedChars(collectResumeText(data)), [data]);

  // Scale the full-size page to fit the preview column.
  const stageRef = useRef<HTMLDivElement>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [frame, setFrame] = useState({ w: PAGE_W_PX, h: PAGE_W_PX * 1.294 });

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

  const handleDownload = () => downloadResumePdf(template, data, "resume.pdf");
  const handleReset = () => setData(sampleResume);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>Vector Résumé Builder</h1>
          <span className="tag">live preview · true-vector PDF · 100% offline</span>
        </div>
        <div className="topbar-actions">
          <button className="btn btn-ghost" onClick={handleReset}>
            Reset sample
          </button>
          <button className="btn btn-primary" onClick={handleDownload}>
            ↓ Download PDF
          </button>
        </div>
      </header>

      {unsupported.length > 0 && (
        <div className="warning-bar" role="alert">
          <strong>Heads up:</strong> this template's font can't render{" "}
          {unsupported.slice(0, 12).map((c) => `“${c}”`).join(", ")}
          {unsupported.length > 12 ? " …" : ""}. Those characters will be left out of the
          PDF.
        </div>
      )}

      <div className="workspace">
        <div className="editor">
          <EditorForm data={data} onChange={setData} />
        </div>

        <div className="preview" ref={stageRef}>
          <div className="page-frame" style={{ width: frame.w, height: frame.h }}>
            <div
              className="page-scaler"
              ref={pageRef}
              style={{ transform: `scale(${scale})`, width: PAGE_W_PX }}
            >
              <Preview data={data} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
