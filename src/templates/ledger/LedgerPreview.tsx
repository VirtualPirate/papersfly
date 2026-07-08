import type { ContactInfo, ResumeData } from "../../data/resume";
import { themeCssVars } from "../../theme/theme";
import { resolveVariant, DEFAULT_VARIANT, type Variant } from "../../theme/variants";
import { fontStyleFor, joinPath, type FontOverrides } from "../../fonts/overrides";
import "./ledger.css";

function contactParts(data: ResumeData): { key: keyof ContactInfo; value: string }[] {
  const c = data.contact;
  const ordered: [keyof ContactInfo, string][] = [
    ["email", c.email], ["phone", c.phone], ["location", c.location],
    ["website", c.website], ["linkedin", c.linkedin],
  ];
  return ordered.filter(([, v]) => v.trim().length > 0).map(([key, value]) => ({ key, value }));
}

export function LedgerPreview({
  data, fontOverrides = {}, variant = DEFAULT_VARIANT,
}: { data: ResumeData; fontOverrides?: FontOverrides; variant?: Variant }) {
  const f = (path: string) => fontStyleFor(fontOverrides, path);
  const parts = contactParts(data);

  return (
    <div className="resume-page ledger" style={themeCssVars(resolveVariant(variant))}>
      <header className="ldg-head">
        <div>
          <h1 className="resume-name" style={f("name")}>{data.name}</h1>
          {data.headline && <div className="ldg-headline" style={f("headline")}>{data.headline}</div>}
        </div>
        {parts.length > 0 && (
          <div className="ldg-contact">
            {parts.map((p) => (
              <div key={p.key} style={f(joinPath("contact", p.key))}>{p.value}</div>
            ))}
          </div>
        )}
      </header>

      <div className="ldg-body">
        {data.summary.trim() && (
          <section className="ldg-section">
            <h2 className="ldg-sec-h" data-pdf-heading>Summary</h2>
            <div className="ldg-sec-body">
              <p className="ldg-summary" data-pdf-block style={f("summary")}>{data.summary}</p>
            </div>
          </section>
        )}

        {data.experience.length > 0 && (
          <section className="ldg-section">
            <h2 className="ldg-sec-h" data-pdf-heading>Experience</h2>
            <div className="ldg-sec-body">
              {data.experience.map((item) => {
                const base = joinPath("experience", item.id);
                return (
                  <div className="ldg-item" data-pdf-block key={item.id}>
                    <div className="ldg-line">
                      <span className="ldg-line-title">
                        <span className="ldg-role" style={f(joinPath(base, "role"))}>{item.role}</span>
                        {item.company && (
                          <span className="ldg-org">
                            {" — "}
                            <span style={f(joinPath(base, "company"))}>{item.company}</span>
                            {item.location && (
                              <span className="ldg-loc" style={f(joinPath(base, "location"))}>, {item.location}</span>
                            )}
                          </span>
                        )}
                      </span>
                      <span className="ldg-date">
                        <span style={f(joinPath(base, "start"))}>{item.start}</span>
                        {item.start && item.end ? "–" : ""}
                        <span style={f(joinPath(base, "end"))}>{item.end}</span>
                      </span>
                    </div>
                    {item.bullets.filter((b) => b.trim()).length > 0 && (
                      <ul className="ldg-bullets" style={f(joinPath(base, "bullets"))}>
                        {item.bullets.filter((b) => b.trim()).map((b, i) => <li key={i}>{b}</li>)}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {data.education.length > 0 && (
          <section className="ldg-section">
            <h2 className="ldg-sec-h" data-pdf-heading>Education</h2>
            <div className="ldg-sec-body">
              {data.education.map((item) => {
                const base = joinPath("education", item.id);
                return (
                  <div className="ldg-item" data-pdf-block key={item.id}>
                    <div className="ldg-line">
                      <span className="ldg-line-title">
                        <span className="ldg-role" style={f(joinPath(base, "institution"))}>{item.institution}</span>
                        {item.degree && (
                          <span className="ldg-org">
                            {" — "}
                            <span style={f(joinPath(base, "degree"))}>{item.degree}</span>
                          </span>
                        )}
                      </span>
                      <span className="ldg-date">
                        <span style={f(joinPath(base, "start"))}>{item.start}</span>
                        {item.start && item.end ? "–" : ""}
                        <span style={f(joinPath(base, "end"))}>{item.end}</span>
                      </span>
                    </div>
                    {item.detail.trim() && (
                      <div className="ldg-detail" style={f(joinPath(base, "detail"))}>{item.detail}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {data.skills.length > 0 && (
          <section className="ldg-section">
            <h2 className="ldg-sec-h" data-pdf-heading>Skills</h2>
            <div className="ldg-sec-body">
              {data.skills.map((g) => {
                const base = joinPath("skills", g.id);
                return (
                  <div className="ldg-skill-row" data-pdf-block key={g.id}>
                    <span className="ldg-skill-label" style={f(joinPath(base, "label"))}>{g.label}</span>
                    <span className="ldg-skill-val" style={f(joinPath(base, "items"))}>
                      {g.items.map((s) => s.trim()).filter(Boolean).join(", ")}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default LedgerPreview;
