import { Fragment } from "react";
import type { ResumeData } from "../../data/resume";
import { themeCssVars } from "../../theme/theme";
import "./classic.css";

/** Contact entries, in display order, dropping any that are empty. */
function contactParts(data: ResumeData): string[] {
  const { email, phone, location, website, linkedin } = data.contact;
  return [email, phone, location, website, linkedin].filter((s) => s.trim().length > 0);
}

export function ClassicPreview({ data }: { data: ResumeData }) {
  const parts = contactParts(data);

  return (
    <div className="resume-page" style={themeCssVars()}>
      {/* Header */}
      <header>
        <h1 className="resume-name">{data.name}</h1>
        {data.headline && <div className="resume-headline">{data.headline}</div>}
        {parts.length > 0 && (
          <div className="resume-contact">
            {parts.map((p, i) => (
              <Fragment key={i}>
                {i > 0 && <span className="sep">·</span>}
                <span>{p}</span>
              </Fragment>
            ))}
          </div>
        )}
        <hr className="header-rule" />
      </header>

      {/* Summary */}
      {data.summary.trim() && (
        <section className="resume-section">
          <h2 className="section-heading">Summary</h2>
          <div className="section-body">
            <p className="resume-summary">{data.summary}</p>
          </div>
        </section>
      )}

      {/* Experience */}
      {data.experience.length > 0 && (
        <section className="resume-section">
          <h2 className="section-heading">Experience</h2>
          <div className="section-body">
            {data.experience.map((item) => (
              <div className="resume-item" key={item.id}>
                <div className="item-header">
                  <span className="item-title">{item.role}</span>
                  <span className="item-date">
                    {item.start}
                    {item.start && item.end ? " – " : ""}
                    {item.end}
                  </span>
                </div>
                <div className="item-org">
                  {item.company}
                  {item.location && (
                    <span className="org-location"> · {item.location}</span>
                  )}
                </div>
                {item.bullets.filter((b) => b.trim()).length > 0 && (
                  <ul className="bullets">
                    {item.bullets
                      .filter((b) => b.trim())
                      .map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {data.education.length > 0 && (
        <section className="resume-section">
          <h2 className="section-heading">Education</h2>
          <div className="section-body">
            {data.education.map((item) => (
              <div className="resume-item" key={item.id}>
                <div className="item-header">
                  <span className="item-title">{item.institution}</span>
                  <span className="item-date">
                    {item.start}
                    {item.start && item.end ? " – " : ""}
                    {item.end}
                  </span>
                </div>
                <div className="item-org">
                  {item.degree}
                  {item.location && (
                    <span className="org-location"> · {item.location}</span>
                  )}
                </div>
                {item.detail.trim() && <div className="item-detail">{item.detail}</div>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {data.skills.length > 0 && (
        <section className="resume-section">
          <h2 className="section-heading">Skills</h2>
          <div className="section-body">
            {data.skills.map((g) => (
              <div className="skill-row" key={g.id}>
                <span className="skill-label">{g.label}</span>
                <span className="skill-values">
                  {g.items.map((s) => s.trim()).filter(Boolean).join(", ")}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
