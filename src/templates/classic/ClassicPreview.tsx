import { Fragment } from "react";
import type { ContactInfo, ResumeData } from "../../data/resume";
import { themeCssVars } from "../../theme/theme";
import { resolveVariant, DEFAULT_VARIANT, type Variant } from "../../theme/variants";
import { fontStyleFor, joinPath, type FontOverrides } from "../../fonts/overrides";
import "./classic.css";

/** Contact entries in display order, carrying each field key, dropping empties. */
function contactParts(data: ResumeData): { key: keyof ContactInfo; value: string }[] {
  const c = data.contact;
  const ordered: [keyof ContactInfo, string][] = [
    ["email", c.email],
    ["phone", c.phone],
    ["location", c.location],
    ["website", c.website],
    ["linkedin", c.linkedin],
  ];
  return ordered
    .filter(([, v]) => v.trim().length > 0)
    .map(([key, value]) => ({ key, value }));
}

export function ClassicPreview({
  data,
  fontOverrides = {},
  variant = DEFAULT_VARIANT,
}: {
  data: ResumeData;
  fontOverrides?: FontOverrides;
  variant?: Variant;
}) {
  const f = (path: string) => fontStyleFor(fontOverrides, path);
  const parts = contactParts(data);

  return (
    <div className="resume-page" style={themeCssVars(resolveVariant(variant))}>
      <header>
        <h1 className="resume-name" style={f("name")}>{data.name}</h1>
        {data.headline && (
          <div className="resume-headline" style={f("headline")}>{data.headline}</div>
        )}
        {parts.length > 0 && (
          <div className="resume-contact">
            {parts.map((p, i) => (
              <Fragment key={p.key}>
                {i > 0 && <span className="sep">·</span>}
                <span style={f(joinPath("contact", p.key))}>{p.value}</span>
              </Fragment>
            ))}
          </div>
        )}
        <hr className="header-rule" />
      </header>

      {data.summary.trim() && (
        <section className="resume-section">
          <h2 className="section-heading" data-pdf-heading>Summary</h2>
          <div className="section-body">
            <p className="resume-summary" data-pdf-block style={f("summary")}>{data.summary}</p>
          </div>
        </section>
      )}

      {data.experience.length > 0 && (
        <section className="resume-section">
          <h2 className="section-heading" data-pdf-heading>Experience</h2>
          <div className="section-body">
            {data.experience.map((item) => {
              const base = joinPath("experience", item.id);
              return (
                <div className="resume-item" data-pdf-block key={item.id}>
                  <div className="item-header">
                    <span className="item-title" style={f(joinPath(base, "role"))}>{item.role}</span>
                    <span className="item-date">
                      <span style={f(joinPath(base, "start"))}>{item.start}</span>
                      {item.start && item.end ? " – " : ""}
                      <span style={f(joinPath(base, "end"))}>{item.end}</span>
                    </span>
                  </div>
                  <div className="item-org">
                    <span style={f(joinPath(base, "company"))}>{item.company}</span>
                    {item.location && (
                      <span className="org-location" style={f(joinPath(base, "location"))}> · {item.location}</span>
                    )}
                  </div>
                  {item.bullets.filter((b) => b.trim()).length > 0 && (
                    <ul className="bullets" style={f(joinPath(base, "bullets"))}>
                      {item.bullets
                        .filter((b) => b.trim())
                        .map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {data.education.length > 0 && (
        <section className="resume-section">
          <h2 className="section-heading" data-pdf-heading>Education</h2>
          <div className="section-body">
            {data.education.map((item) => {
              const base = joinPath("education", item.id);
              return (
                <div className="resume-item" data-pdf-block key={item.id}>
                  <div className="item-header">
                    <span className="item-title" style={f(joinPath(base, "institution"))}>{item.institution}</span>
                    <span className="item-date">
                      <span style={f(joinPath(base, "start"))}>{item.start}</span>
                      {item.start && item.end ? " – " : ""}
                      <span style={f(joinPath(base, "end"))}>{item.end}</span>
                    </span>
                  </div>
                  <div className="item-org">
                    <span style={f(joinPath(base, "degree"))}>{item.degree}</span>
                    {item.location && (
                      <span className="org-location" style={f(joinPath(base, "location"))}> · {item.location}</span>
                    )}
                  </div>
                  {item.detail.trim() && (
                    <div className="item-detail" style={f(joinPath(base, "detail"))}>{item.detail}</div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {data.skills.length > 0 && (
        <section className="resume-section">
          <h2 className="section-heading" data-pdf-heading>Skills</h2>
          <div className="section-body">
            {data.skills.map((g) => {
              const base = joinPath("skills", g.id);
              return (
                <div className="skill-row" data-pdf-block key={g.id}>
                  <span className="skill-label" style={f(joinPath(base, "label"))}>{g.label}</span>
                  <span className="skill-values" style={f(joinPath(base, "items"))}>
                    {g.items.map((s) => s.trim()).filter(Boolean).join(", ")}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

export default ClassicPreview;
