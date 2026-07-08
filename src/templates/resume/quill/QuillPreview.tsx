import { Fragment } from "react";
import type { ContactInfo, ResumeData } from "../../../data/resume";
import { themeCssVars } from "../../../theme/theme";
import { resolveVariant, DEFAULT_VARIANT, type Variant } from "../../../theme/variants";
import { fontStyleFor, joinPath, type FontOverrides } from "../../../fonts/overrides";
import "./quill.css";

function contactParts(data: ResumeData): { key: keyof ContactInfo; value: string }[] {
  const c = data.contact;
  const ordered: [keyof ContactInfo, string][] = [
    ["email", c.email], ["phone", c.phone], ["location", c.location],
    ["website", c.website], ["linkedin", c.linkedin],
  ];
  return ordered.filter(([, v]) => v.trim().length > 0).map(([key, value]) => ({ key, value }));
}

export function QuillPreview({
  data, fontOverrides = {}, variant = DEFAULT_VARIANT,
}: { data: ResumeData; fontOverrides?: FontOverrides; variant?: Variant }) {
  const f = (path: string) => fontStyleFor(fontOverrides, path);
  const parts = contactParts(data);

  return (
    <div className="resume-page quill" style={themeCssVars(resolveVariant(variant))}>
      <header className="qll-head">
        <h1 className="resume-name" style={f("name")}>{data.name}</h1>
        {data.headline && <div className="qll-headline" style={f("headline")}>{data.headline}</div>}
        {parts.length > 0 && (
          <div className="qll-contact">
            {parts.map((p, i) => (
              <Fragment key={p.key}>
                {i > 0 && <span className="qll-sep">·</span>}
                <span style={f(joinPath("contact", p.key))}>{p.value}</span>
              </Fragment>
            ))}
          </div>
        )}
      </header>
      <div className="qll-rule" />

      <div className="qll-body">
        {data.summary.trim() && (
          <section className="qll-section">
            <h2 className="qll-sec-h" data-pdf-heading>Summary</h2>
            <div className="qll-sec-body">
              <p className="qll-summary" data-pdf-block style={f("summary")}>{data.summary}</p>
            </div>
          </section>
        )}

        {data.experience.length > 0 && (
          <section className="qll-section">
            <h2 className="qll-sec-h" data-pdf-heading>Experience</h2>
            <div className="qll-sec-body">
              {data.experience.map((item) => {
                const base = joinPath("experience", item.id);
                return (
                  <div className="qll-item" data-pdf-block key={item.id}>
                    <div className="qll-item-header">
                      <span className="qll-role" style={f(joinPath(base, "role"))}>{item.role}</span>
                      <span className="qll-date">
                        <span style={f(joinPath(base, "start"))}>{item.start}</span>
                        {item.start && item.end ? " – " : ""}
                        <span style={f(joinPath(base, "end"))}>{item.end}</span>
                      </span>
                    </div>
                    <div className="qll-org">
                      <span className="qll-co" style={f(joinPath(base, "company"))}>{item.company}</span>
                      {item.location && (
                        <span className="qll-loc" style={f(joinPath(base, "location"))}> · {item.location}</span>
                      )}
                    </div>
                    {item.bullets.filter((b) => b.trim()).length > 0 && (
                      <ul className="qll-bullets" style={f(joinPath(base, "bullets"))}>
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
          <section className="qll-section">
            <h2 className="qll-sec-h" data-pdf-heading>Education</h2>
            <div className="qll-sec-body">
              {data.education.map((item) => {
                const base = joinPath("education", item.id);
                return (
                  <div className="qll-item" data-pdf-block key={item.id}>
                    <div className="qll-item-header">
                      <span className="qll-role" style={f(joinPath(base, "institution"))}>{item.institution}</span>
                      <span className="qll-date">
                        <span style={f(joinPath(base, "start"))}>{item.start}</span>
                        {item.start && item.end ? " – " : ""}
                        <span style={f(joinPath(base, "end"))}>{item.end}</span>
                      </span>
                    </div>
                    <div className="qll-org">
                      <span style={f(joinPath(base, "degree"))}>{item.degree}</span>
                      {item.location && (
                        <span className="qll-loc" style={f(joinPath(base, "location"))}> · {item.location}</span>
                      )}
                    </div>
                    {item.detail.trim() && (
                      <div className="qll-detail" style={f(joinPath(base, "detail"))}>{item.detail}</div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {data.skills.length > 0 && (
          <section className="qll-section">
            <h2 className="qll-sec-h" data-pdf-heading>Skills</h2>
            <div className="qll-sec-body">
              {data.skills.map((g) => {
                const base = joinPath("skills", g.id);
                return (
                  <div className="qll-skill-row" data-pdf-block key={g.id}>
                    <span className="qll-skill-label" style={f(joinPath(base, "label"))}>{g.label}</span>
                    <span className="qll-skill-val" style={f(joinPath(base, "items"))}>
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

export default QuillPreview;
