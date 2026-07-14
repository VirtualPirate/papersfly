import type { CoverLetterData } from "../../../data/coverLetter";
import { themeCssVars } from "../../../theme/theme";
import { resolveVariant, DEFAULT_VARIANT, type Variant } from "../../../theme/variants";
import { fontStyleFor, joinPath, type FontOverrides } from "../../../fonts/overrides";
import { MISSIVE_VARIANTS } from "../variants";
import "./missive.css";

export function MissivePreview({
  data, fontOverrides = {}, variant = DEFAULT_VARIANT,
}: { data: CoverLetterData; fontOverrides?: FontOverrides; variant?: Variant }) {
  const f = (path: string) => fontStyleFor(fontOverrides, path);
  const c = data.contact;
  const r = data.recipient;
  const returnLines = [
    data.headline,
    c.location,
    c.email,
    [c.phone, c.website].filter((v) => v.trim()).join(" · "),
  ].filter((v) => v.trim().length > 0);

  return (
    <div className="resume-page t-missive" style={themeCssVars(resolveVariant(variant, MISSIVE_VARIANTS.colors, MISSIVE_VARIANTS.fonts))}>
      <div className="mis-return" data-pdf-block>
        {data.name && <strong style={f("name")}>{data.name}</strong>}
        {returnLines.map((line) => (
          <div key={line}>{line}</div>
        ))}
      </div>

      <div className="mis-matter" data-pdf-block>
        {data.date && <div className="mis-date">{data.date}</div>}
        <div className="mis-to">
          {r.name && <strong style={f(joinPath("recipient", "name"))}>{r.name}</strong>}
          {r.title && <div>{r.title}</div>}
          {r.company && <div>{r.company}</div>}
          {r.address && <div>{r.address}</div>}
        </div>
        {data.subject && <div className="mis-re">Re: {data.subject}</div>}
      </div>

      {data.salutation && (
        <h1 className="mis-salute" data-pdf-block style={f("salutation")}>{data.salutation}</h1>
      )}
      <div className="mis-body">
        {data.paragraphs.map((p) => (
          <p className="mis-para" data-pdf-block key={p.id} style={f(joinPath(joinPath("paragraphs", p.id), "text"))}>
            {p.text}
          </p>
        ))}
      </div>

      <div className="mis-close" data-pdf-block>
        {data.closing && <div className="mis-close-word">{data.closing}</div>}
        {data.signature && <div className="mis-sig" style={f("signature")}>{data.signature}</div>}
      </div>
    </div>
  );
}

export default MissivePreview;
