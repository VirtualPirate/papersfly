import type { CoverLetterData } from "../../../data/coverLetter";
import { themeCssVars } from "../../../theme/theme";
import { resolveVariant, DEFAULT_VARIANT, type Variant } from "../../../theme/variants";
import { fontStyleFor, joinPath, type FontOverrides } from "../../../fonts/overrides";
import { ghostInitial } from "../../../documents/cover-letter/derive";
import { FOUNDRY_VARIANTS } from "../variants";
import "./foundry.css";

export function FoundryPreview({
  data, fontOverrides = {}, variant = DEFAULT_VARIANT,
}: { data: CoverLetterData; fontOverrides?: FontOverrides; variant?: Variant }) {
  const f = (path: string) => fontStyleFor(fontOverrides, path);
  const c = data.contact;
  const r = data.recipient;
  const ghost = ghostInitial(data.name);
  const toLine = [r.name, r.title].filter((v) => v.trim()).join(" · ");
  const atLine = [r.company, r.address].filter((v) => v.trim()).join(", ");
  const contactLines = [
    c.email,
    c.phone,
    c.location,
    [c.website, c.linkedin].filter((v) => v.trim()).join(" · "),
  ].filter((v) => v.trim().length > 0);

  return (
    <div className="resume-page t-foundry" style={themeCssVars(resolveVariant(variant, FOUNDRY_VARIANTS.colors, FOUNDRY_VARIANTS.fonts))}>
      {ghost && <div className="fdy-ghost" aria-hidden="true">{ghost}</div>}

      <header className="fdy-head" data-pdf-block>
        <div>
          <h1 className="fdy-name" style={f("name")}>{data.name}</h1>
          {data.headline && <div className="fdy-role" style={f("headline")}>{data.headline}</div>}
        </div>
        {contactLines.length > 0 && (
          <div className="fdy-contact">
            {contactLines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </div>
        )}
      </header>
      <div className="fdy-rule" />

      <div className="fdy-meta" data-pdf-block>
        <div>
          {toLine && (
            <div>
              <span className="fdy-label">To</span>
              <span style={f(joinPath("recipient", "name"))}>{toLine}</span>
            </div>
          )}
          {atLine && (
            <div>
              <span className="fdy-label" aria-hidden="true" />
              <span>{atLine}</span>
            </div>
          )}
        </div>
        <div>
          {data.date && (
            <div>
              <span className="fdy-label">Date</span>
              <span>{data.date}</span>
            </div>
          )}
          {data.subject && (
            <div>
              <span className="fdy-label">Re</span>
              <strong>{data.subject}</strong>
            </div>
          )}
        </div>
      </div>

      {data.salutation && (
        <div className="fdy-salute" data-pdf-block style={f("salutation")}>{data.salutation}</div>
      )}
      {data.paragraphs.map((p) => (
        <p className="fdy-para" data-pdf-block key={p.id} style={f(joinPath(joinPath("paragraphs", p.id), "text"))}>
          {p.text}
        </p>
      ))}

      <div className="fdy-close" data-pdf-block>
        {data.closing && <div>{data.closing}</div>}
        {data.signature && <div className="fdy-sig" style={f("signature")}>{data.signature}</div>}
      </div>
    </div>
  );
}

export default FoundryPreview;
