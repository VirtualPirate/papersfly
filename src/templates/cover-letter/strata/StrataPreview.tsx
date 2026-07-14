import type { CoverLetterData } from "../../../data/coverLetter";
import { themeCssVars } from "../../../theme/theme";
import { resolveVariant, DEFAULT_VARIANT, type Variant } from "../../../theme/variants";
import { fontStyleFor, joinPath, type FontOverrides } from "../../../fonts/overrides";
import { STRATA_VARIANTS } from "../variants";
import "./strata.css";

export function StrataPreview({
  data, fontOverrides = {}, variant = DEFAULT_VARIANT,
}: { data: CoverLetterData; fontOverrides?: FontOverrides; variant?: Variant }) {
  const f = (path: string) => fontStyleFor(fontOverrides, path);
  const c = data.contact;
  const r = data.recipient;
  const contactLines = [
    c.email,
    c.phone,
    c.location,
    [c.website, c.linkedin].filter((v) => v.trim()).join(" · "),
  ].filter((v) => v.trim().length > 0);

  return (
    <div className="resume-page t-strata" style={themeCssVars(resolveVariant(variant, STRATA_VARIANTS.colors, STRATA_VARIANTS.fonts))}>
      <header className="str-head" data-pdf-block>
        <div>
          <h1 className="str-name" style={f("name")}>{data.name}</h1>
          {data.headline && <div className="str-role" style={f("headline")}>{data.headline}</div>}
        </div>
        {contactLines.length > 0 && (
          <div className="str-contact">
            {contactLines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        )}
      </header>
      <div className="str-bar" />

      <div className={`str-matter${data.subject ? "" : " str-matter--nore"}`} data-pdf-block>
        <div className="str-cell">
          <div className="str-label">To</div>
          <div className="str-value">
            {r.name && <strong style={f(joinPath("recipient", "name"))}>{r.name}</strong>}
            {r.title && <div>{r.title}</div>}
            {r.company && <div>{r.company}</div>}
            {r.address && <div>{r.address}</div>}
          </div>
        </div>
        {data.subject && (
          <div className="str-cell">
            <div className="str-label">Re</div>
            <div className="str-value">{data.subject}</div>
          </div>
        )}
        <div className="str-cell">
          <div className="str-label">Date</div>
          <div className="str-value">{data.date}</div>
        </div>
      </div>

      <div className="str-body">
        {data.salutation && (
          <div className="str-salute" data-pdf-block style={f("salutation")}>{data.salutation}</div>
        )}
        {data.paragraphs.map((p) => (
          <p className="str-para" data-pdf-block key={p.id} style={f(joinPath(joinPath("paragraphs", p.id), "text"))}>
            {p.text}
          </p>
        ))}
        <div className="str-close-block" data-pdf-block>
          {data.closing && <div className="str-close">{data.closing}</div>}
          {data.signature && <div className="str-sig" style={f("signature")}>{data.signature}</div>}
        </div>
      </div>
    </div>
  );
}

export default StrataPreview;
