import type { ContactInfo, ResumeData } from "../../data/resume";
import { themeCssVars } from "../../theme/theme";
import { resolveVariant, DEFAULT_VARIANT, type Variant } from "../../theme/variants";
import { fontStyleFor, joinPath, type FontOverrides } from "../../fonts/overrides";
import "./atlas.css";

function contactParts(data: ResumeData): { key: keyof ContactInfo; value: string }[] {
  const c = data.contact;
  const ordered: [keyof ContactInfo, string][] = [
    ["email", c.email], ["phone", c.phone], ["location", c.location],
    ["website", c.website], ["linkedin", c.linkedin],
  ];
  return ordered.filter(([, v]) => v.trim().length > 0).map(([key, value]) => ({ key, value }));
}

export function AtlasPreview({
  data, fontOverrides = {}, variant = DEFAULT_VARIANT,
}: { data: ResumeData; fontOverrides?: FontOverrides; variant?: Variant }) {
  const f = (path: string) => fontStyleFor(fontOverrides, path);
  const parts = contactParts(data);

  return (
    <div className="resume-page atlas" style={themeCssVars(resolveVariant(variant))}>
      <aside className="atl-side">
        <h1 className="resume-name" style={f("name")}>{data.name}</h1>
        {data.headline && <div className="atl-headline" style={f("headline")}>{data.headline}</div>}

        {parts.length > 0 && (
          <div className="atl-block">
            <h2 className="atl-h">Contact</h2>
            {parts.map((p) => (
              <div className="atl-contact-line" key={p.key} style={f(joinPath("contact", p.key))}>{p.value}</div>
            ))}
          </div>
        )}

        {data.skills.length > 0 && (
          <div className="atl-block">
            <h2 className="atl-h">Skills</h2>
            {data.skills.map((g) => {
              const base = joinPath("skills", g.id);
              return (
                <div className="atl-skill" key={g.id}>
                  <div className="atl-skill-label" style={f(joinPath(base, "label"))}>{g.label}</div>
                  <div className="atl-skill-val" style={f(joinPath(base, "items"))}>
                    {g.items.map((s) => s.trim()).filter(Boolean).join(", ")}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {data.education.length > 0 && (
          <div className="atl-block">
            <h2 className="atl-h">Education</h2>
            {data.education.map((item) => {
              const base = joinPath("education", item.id);
              return (
                <div className="atl-edu" key={item.id}>
                  <div className="atl-edu-deg" style={f(joinPath(base, "degree"))}>{item.degree}</div>
                  <div className="atl-edu-inst" style={f(joinPath(base, "institution"))}>{item.institution}</div>
                  <div className="atl-edu-meta">
                    <span style={f(joinPath(base, "start"))}>{item.start}</span>
                    {item.start && item.end ? " – " : ""}
                    <span style={f(joinPath(base, "end"))}>{item.end}</span>
                    {item.location && (
                      <>
                        {" · "}
                        <span style={f(joinPath(base, "location"))}>{item.location}</span>
                      </>
                    )}
                  </div>
                  {item.detail.trim() && (
                    <div className="atl-edu-meta" style={f(joinPath(base, "detail"))}>{item.detail}</div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </aside>

      <main className="atl-main">
        {data.summary.trim() && (
          <div className="atl-block">
            <h2 className="atl-h">Summary</h2>
            <p className="atl-summary" style={f("summary")}>{data.summary}</p>
          </div>
        )}

        {data.experience.length > 0 && (
          <div className="atl-block">
            <h2 className="atl-h">Experience</h2>
            {data.experience.map((item) => {
              const base = joinPath("experience", item.id);
              return (
                <div className="atl-item" key={item.id}>
                  <div className="atl-item-header">
                    <span className="atl-role" style={f(joinPath(base, "role"))}>{item.role}</span>
                    <span className="atl-date">
                      <span style={f(joinPath(base, "start"))}>{item.start}</span>
                      {item.start && item.end ? " – " : ""}
                      <span style={f(joinPath(base, "end"))}>{item.end}</span>
                    </span>
                  </div>
                  <div className="atl-org">
                    <span style={f(joinPath(base, "company"))}>{item.company}</span>
                    {item.location && (
                      <span className="atl-loc" style={f(joinPath(base, "location"))}> · {item.location}</span>
                    )}
                  </div>
                  {item.bullets.filter((b) => b.trim()).length > 0 && (
                    <ul className="atl-bullets" style={f(joinPath(base, "bullets"))}>
                      {item.bullets.filter((b) => b.trim()).map((b, i) => <li key={i}>{b}</li>)}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

export default AtlasPreview;
