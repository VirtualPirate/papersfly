import type { ContactInfo, ResumeData } from "../../../data/resume";
import { themeCssVars } from "../../../theme/theme";
import { resolveVariant, DEFAULT_VARIANT, type Variant } from "../../../theme/variants";
import { fontStyleFor, joinPath, type FontOverrides } from "../../../fonts/overrides";
import "./vantage.css";

/** Contact rows in display order, each with its label, dropping the empty ones. */
function contactParts(
  data: ResumeData,
): { key: keyof ContactInfo; label: string; value: string }[] {
  const c = data.contact;
  const ordered: [keyof ContactInfo, string, string][] = [
    ["email", "Email", c.email],
    ["phone", "Phone", c.phone],
    ["location", "Address", c.location],
    ["website", "Website", c.website],
    ["linkedin", "LinkedIn", c.linkedin],
  ];
  return ordered
    .filter(([, , v]) => v.trim().length > 0)
    .map(([key, label, value]) => ({ key, label, value }));
}

/**
 * Vantage — a two-column resume: a full-width header band with a centered tab,
 * a bold uppercase wordmark over the profession, then a wide main column
 * (summary / experience / education) beside a narrow rail (contact / skills).
 *
 * Two-column, so — like Atlas — it carries no `data-pdf-*` markers: a full-width
 * page-break spacer cannot be inserted into a column flow (see templates/AGENTS.md).
 */
export function VantagePreview({
  data,
  fontOverrides = {},
  variant = DEFAULT_VARIANT,
}: {
  data: ResumeData;
  fontOverrides?: FontOverrides;
  variant?: Variant;
}) {
  const f = (path: string) => fontStyleFor(fontOverrides, path);
  const contact = contactParts(data);

  return (
    <div className="resume-page t-vantage" style={themeCssVars(resolveVariant(variant))}>
      <div className="vt-topband">
        <div className="vt-tab" />
      </div>

      <header className="vt-header">
        <h1 className="resume-name" style={f("name")}>{data.name}</h1>
        {data.headline && (
          <div className="vt-headline" style={f("headline")}>{data.headline}</div>
        )}
      </header>
      <div className="vt-rule" />

      <div className="vt-body">
        <main className="vt-main">
          {data.summary.trim() && (
            <section className="vt-section">
              <h2 className="vt-h"><span>Professional Summary</span><span className="vt-h-bar" /></h2>
              <p className="vt-summary" style={f("summary")}>{data.summary}</p>
            </section>
          )}

          {data.experience.length > 0 && (
            <section className="vt-section">
              <h2 className="vt-h"><span>Experience</span><span className="vt-h-bar" /></h2>
              {data.experience.map((item) => {
                const base = joinPath("experience", item.id);
                return (
                  <div className="vt-item" key={item.id}>
                    <div className="vt-role">
                      <span style={f(joinPath(base, "role"))}>{item.role}</span>
                      {(item.start || item.end) && (
                        <span className="vt-dates">
                          {", "}
                          <span style={f(joinPath(base, "start"))}>{item.start}</span>
                          {item.start && item.end ? " – " : ""}
                          <span style={f(joinPath(base, "end"))}>{item.end}</span>
                        </span>
                      )}
                    </div>
                    <div className="vt-org">
                      <span style={f(joinPath(base, "company"))}>{item.company}</span>
                      {item.location && (
                        <span className="vt-loc" style={f(joinPath(base, "location"))}> · {item.location}</span>
                      )}
                    </div>
                    {item.bullets.filter((b) => b.trim()).length > 0 && (
                      <ul className="vt-bullets" style={f(joinPath(base, "bullets"))}>
                        {item.bullets.filter((b) => b.trim()).map((b, i) => <li key={i}>{b}</li>)}
                      </ul>
                    )}
                  </div>
                );
              })}
            </section>
          )}

          {data.education.length > 0 && (
            <section className="vt-section">
              <h2 className="vt-h"><span>Education</span><span className="vt-h-bar" /></h2>
              {data.education.map((item) => {
                const base = joinPath("education", item.id);
                return (
                  <div className="vt-edu" key={item.id}>
                    <div className="vt-edu-deg" style={f(joinPath(base, "degree"))}>{item.degree}</div>
                    <div className="vt-edu-inst" style={f(joinPath(base, "institution"))}>{item.institution}</div>
                    <div className="vt-edu-meta">
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
                      <div className="vt-edu-meta" style={f(joinPath(base, "detail"))}>{item.detail}</div>
                    )}
                  </div>
                );
              })}
            </section>
          )}
        </main>

        <aside className="vt-aside">
          {contact.length > 0 && (
            <section className="vt-section">
              <h2 className="vt-h"><span>Contact</span><span className="vt-h-bar" /></h2>
              {contact.map((p) => (
                <div className="vt-contact-line" key={p.key} style={f(joinPath("contact", p.key))}>
                  <span className="vt-contact-label">{p.label}</span>
                  <br />
                  {p.value}
                </div>
              ))}
            </section>
          )}

          {data.skills.length > 0 && (
            <section className="vt-section">
              <h2 className="vt-h"><span>Skills</span><span className="vt-h-bar" /></h2>
              {data.skills.map((g) => {
                const base = joinPath("skills", g.id);
                const items = g.items.map((s) => s.trim()).filter(Boolean);
                return (
                  <div className="vt-skillgroup" key={g.id}>
                    <div className="vt-skill-label" style={f(joinPath(base, "label"))}>{g.label}</div>
                    {items.length > 0 && (
                      <div className="vt-skill-line" style={f(joinPath(base, "items"))}>{items.join(", ")}</div>
                    )}
                  </div>
                );
              })}
              <div className="vt-skills-end" />
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

export default VantagePreview;
