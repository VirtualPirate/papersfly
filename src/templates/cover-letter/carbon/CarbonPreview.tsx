import type { CoverLetterData } from "../../../data/coverLetter";
import { themeCssVars } from "../../../theme/theme";
import { resolveVariant, DEFAULT_VARIANT, type Variant } from "../../../theme/variants";
import { fontStyleFor, joinPath, type FontOverrides } from "../../../fonts/overrides";
import { CARBON_VARIANTS } from "../variants";
import "./carbon.css";

function RoutingRow({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="car-row">
      <span className="car-label">{label}</span>
      <span className="car-leader" />
      <span className={`car-value${accent ? " car-re" : ""}`}>{value}</span>
    </div>
  );
}

export function CarbonPreview({
  data, fontOverrides = {}, variant = DEFAULT_VARIANT,
}: { data: CoverLetterData; fontOverrides?: FontOverrides; variant?: Variant }) {
  const f = (path: string) => fontStyleFor(fontOverrides, path);
  const c = data.contact;
  const r = data.recipient;
  const toValue = [r.name, r.title].filter((v) => v.trim()).join(", ");
  const atValue = [r.company, r.address].filter((v) => v.trim()).join(" — ");
  const footer = [c.email, c.phone, c.website, c.linkedin].filter((v) => v.trim()).join(" · ");
  const subLine = [data.headline, c.location].filter((v) => v.trim()).join(" · ");

  return (
    <div className="resume-page t-carbon" style={themeCssVars(resolveVariant(variant, CARBON_VARIANTS.colors, CARBON_VARIANTS.fonts))}>
      <header className="car-head" data-pdf-block>
        <h1 className="car-name" style={f("name")}>{data.name}</h1>
        {subLine && <div className="car-sub" style={f("headline")}>{subLine}</div>}
        <div className="car-double" />
      </header>

      <div className="car-routing" data-pdf-block>
        {toValue && <RoutingRow label="To" value={toValue} />}
        {atValue && <RoutingRow label="At" value={atValue} />}
        {data.subject && <RoutingRow label="Re" value={data.subject} accent />}
        {data.date && <RoutingRow label="Date" value={data.date} />}
      </div>

      <div className="car-body">
        {data.salutation && (
          <p className="car-salute" data-pdf-block style={f("salutation")}>{data.salutation}</p>
        )}
        {data.paragraphs.map((p) => (
          <p className="car-para" data-pdf-block key={p.id} style={f(joinPath(joinPath("paragraphs", p.id), "text"))}>
            {p.text}
          </p>
        ))}
      </div>

      <div className="car-close" data-pdf-block>
        {data.closing && <div>{data.closing}</div>}
        {data.signature && <div className="car-sig" style={f("signature")}>{data.signature}</div>}
      </div>

      {footer && <footer className="car-foot" data-pdf-block>{footer}</footer>}
    </div>
  );
}

export default CarbonPreview;
