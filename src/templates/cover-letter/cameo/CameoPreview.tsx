import { Fragment } from "react";
import type { ContactInfo } from "../../../data/resume";
import type { CoverLetterData } from "../../../data/coverLetter";
import { themeCssVars } from "../../../theme/theme";
import { resolveVariant, DEFAULT_VARIANT, type Variant } from "../../../theme/variants";
import { fontStyleFor, joinPath, type FontOverrides } from "../../../fonts/overrides";
import { monogram } from "../../../documents/cover-letter/derive";
import { CAMEO_VARIANTS } from "../variants";
import "./cameo.css";

function contactParts(c: ContactInfo): { key: keyof ContactInfo; value: string }[] {
  const ordered: [keyof ContactInfo, string][] = [
    ["email", c.email], ["phone", c.phone], ["location", c.location],
    ["website", c.website], ["linkedin", c.linkedin],
  ];
  return ordered.filter(([, v]) => v.trim().length > 0).map(([key, value]) => ({ key, value }));
}

export function CameoPreview({
  data, fontOverrides = {}, variant = DEFAULT_VARIANT,
}: { data: CoverLetterData; fontOverrides?: FontOverrides; variant?: Variant }) {
  const f = (path: string) => fontStyleFor(fontOverrides, path);
  const parts = contactParts(data.contact);
  const mono = monogram(data.name);
  const r = data.recipient;

  return (
    <div className="resume-page t-cameo" style={themeCssVars(resolveVariant(variant, CAMEO_VARIANTS.colors, CAMEO_VARIANTS.fonts))}>
      <header className="cam-head" data-pdf-block>
        {mono && <div className="cam-mono" aria-hidden="true">{mono}</div>}
        <h1 className="cam-name" style={f("name")}>{data.name}</h1>
        {data.headline && <div className="cam-role" style={f("headline")}>{data.headline}</div>}
        {parts.length > 0 && (
          <div className="cam-contact">
            {parts.map((p, i) => (
              <Fragment key={p.key}>
                {i > 0 && <span className="cam-sep">·</span>}
                <span style={f(joinPath("contact", p.key))}>{p.value}</span>
              </Fragment>
            ))}
          </div>
        )}
        <div className="cam-rule" />
      </header>

      <div className="cam-matter" data-pdf-block>
        {data.date && <div className="cam-date">{data.date}</div>}
        <div className="cam-to">
          {r.name && <strong style={f(joinPath("recipient", "name"))}>{r.name}</strong>}
          {r.title && <div>{r.title}</div>}
          {r.company && <div>{r.company}</div>}
          {r.address && <div>{r.address}</div>}
        </div>
        {data.subject && <div className="cam-re">Re: {data.subject}</div>}
      </div>

      {data.salutation && (
        <div className="cam-salute" data-pdf-block style={f("salutation")}>{data.salutation}</div>
      )}
      {data.paragraphs.map((p) => (
        <p className="cam-body" data-pdf-block key={p.id} style={f(joinPath(joinPath("paragraphs", p.id), "text"))}>
          {p.text}
        </p>
      ))}

      <div className="cam-close" data-pdf-block>
        {data.closing && <div className="cam-close-word">{data.closing}</div>}
        {data.signature && (
          <>
            <div className="cam-sig" style={f("signature")}>{data.signature}</div>
            <div className="cam-typed">{data.signature}</div>
          </>
        )}
      </div>
    </div>
  );
}

export default CameoPreview;
