import type { ReactNode } from "react";
import type {
  EducationItem,
  ExperienceItem,
  ResumeData,
  SkillGroup,
} from "../data/resume";

/**
 * A labelled field. The control is nested INSIDE the <label>, which gives an
 * implicit programmatic association (screen readers announce it; clicking the
 * text focuses the control) without needing matching id/htmlFor on every input.
 */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      {children}
    </label>
  );
}

/**
 * Controlled form bound to `ResumeData`. Every edit produces a new immutable
 * data object via `onChange`, which re-renders the live preview instantly.
 */
export function EditorForm({
  data,
  onChange,
}: {
  data: ResumeData;
  onChange: (next: ResumeData) => void;
}) {
  const patch = (partial: Partial<ResumeData>) => onChange({ ...data, ...partial });
  const newId = () => (crypto.randomUUID?.() ?? `id-${Math.random().toString(36).slice(2)}`);

  // ---- Experience helpers ----
  const updateExp = (id: string, partial: Partial<ExperienceItem>) =>
    patch({
      experience: data.experience.map((e) => (e.id === id ? { ...e, ...partial } : e)),
    });
  const addExp = () =>
    patch({
      experience: [
        ...data.experience,
        {
          id: newId(),
          role: "Job Title",
          company: "Company",
          location: "",
          start: "20XX",
          end: "Present",
          bullets: ["Describe an accomplishment with measurable impact."],
        },
      ],
    });
  const removeExp = (id: string) =>
    patch({ experience: data.experience.filter((e) => e.id !== id) });

  // ---- Education helpers ----
  const updateEdu = (id: string, partial: Partial<EducationItem>) =>
    patch({
      education: data.education.map((e) => (e.id === id ? { ...e, ...partial } : e)),
    });
  const addEdu = () =>
    patch({
      education: [
        ...data.education,
        {
          id: newId(),
          institution: "Institution",
          degree: "Degree",
          location: "",
          start: "20XX",
          end: "20XX",
          detail: "",
        },
      ],
    });
  const removeEdu = (id: string) =>
    patch({ education: data.education.filter((e) => e.id !== id) });

  // ---- Skills helpers ----
  const updateSkill = (id: string, partial: Partial<SkillGroup>) =>
    patch({ skills: data.skills.map((s) => (s.id === id ? { ...s, ...partial } : s)) });
  const addSkill = () =>
    patch({
      skills: [...data.skills, { id: newId(), label: "Category", items: [] }],
    });
  const removeSkill = (id: string) =>
    patch({ skills: data.skills.filter((s) => s.id !== id) });

  const setContact = (key: keyof ResumeData["contact"], value: string) =>
    patch({ contact: { ...data.contact, [key]: value } });

  return (
    <form className="editor-form" onSubmit={(e) => e.preventDefault()}>
      {/* Basics */}
      <section className="form-section">
        <h2>Basics</h2>
        <Field label="Full name">
          <input value={data.name} onChange={(e) => patch({ name: e.target.value })} />
        </Field>
        <Field label="Headline">
          <input value={data.headline} onChange={(e) => patch({ headline: e.target.value })} />
        </Field>
        <div className="field-row">
          <Field label="Email">
            <input value={data.contact.email} onChange={(e) => setContact("email", e.target.value)} />
          </Field>
          <Field label="Phone">
            <input value={data.contact.phone} onChange={(e) => setContact("phone", e.target.value)} />
          </Field>
        </div>
        <div className="field-row">
          <Field label="Location">
            <input
              value={data.contact.location}
              onChange={(e) => setContact("location", e.target.value)}
            />
          </Field>
          <Field label="Website">
            <input
              value={data.contact.website}
              onChange={(e) => setContact("website", e.target.value)}
            />
          </Field>
        </div>
        <Field label="LinkedIn">
          <input
            value={data.contact.linkedin}
            onChange={(e) => setContact("linkedin", e.target.value)}
          />
        </Field>
      </section>

      {/* Summary */}
      <section className="form-section">
        <h2>Summary</h2>
        <Field label="Professional summary">
          <textarea
            rows={4}
            value={data.summary}
            onChange={(e) => patch({ summary: e.target.value })}
          />
        </Field>
      </section>

      {/* Experience */}
      <section className="form-section">
        <h2>
          Experience
          <button type="button" className="btn-mini" onClick={addExp}>
            + Add
          </button>
        </h2>
        {data.experience.map((item, i) => (
          <div className="card" key={item.id}>
            <div className="card-head">
              <span className="idx">#{i + 1}</span>
              <button
                type="button"
                className="btn-mini danger"
                onClick={() => removeExp(item.id)}
                aria-label={`Remove experience ${i + 1}`}
              >
                Remove
              </button>
            </div>
            <Field label="Role">
              <input value={item.role} onChange={(e) => updateExp(item.id, { role: e.target.value })} />
            </Field>
            <div className="field-row">
              <Field label="Company">
                <input
                  value={item.company}
                  onChange={(e) => updateExp(item.id, { company: e.target.value })}
                />
              </Field>
              <Field label="Location">
                <input
                  value={item.location}
                  onChange={(e) => updateExp(item.id, { location: e.target.value })}
                />
              </Field>
            </div>
            <div className="field-row">
              <Field label="Start">
                <input
                  value={item.start}
                  onChange={(e) => updateExp(item.id, { start: e.target.value })}
                />
              </Field>
              <Field label="End">
                <input value={item.end} onChange={(e) => updateExp(item.id, { end: e.target.value })} />
              </Field>
            </div>
            <Field label="Bullets (one per line)">
              <textarea
                rows={4}
                value={item.bullets.join("\n")}
                onChange={(e) => updateExp(item.id, { bullets: e.target.value.split("\n") })}
              />
            </Field>
          </div>
        ))}
      </section>

      {/* Education */}
      <section className="form-section">
        <h2>
          Education
          <button type="button" className="btn-mini" onClick={addEdu}>
            + Add
          </button>
        </h2>
        {data.education.map((item, i) => (
          <div className="card" key={item.id}>
            <div className="card-head">
              <span className="idx">#{i + 1}</span>
              <button
                type="button"
                className="btn-mini danger"
                onClick={() => removeEdu(item.id)}
                aria-label={`Remove education ${i + 1}`}
              >
                Remove
              </button>
            </div>
            <Field label="Institution">
              <input
                value={item.institution}
                onChange={(e) => updateEdu(item.id, { institution: e.target.value })}
              />
            </Field>
            <Field label="Degree">
              <input value={item.degree} onChange={(e) => updateEdu(item.id, { degree: e.target.value })} />
            </Field>
            <div className="field-row">
              <Field label="Start">
                <input
                  value={item.start}
                  onChange={(e) => updateEdu(item.id, { start: e.target.value })}
                />
              </Field>
              <Field label="End">
                <input value={item.end} onChange={(e) => updateEdu(item.id, { end: e.target.value })} />
              </Field>
            </div>
            <Field label="Location">
              <input
                value={item.location}
                onChange={(e) => updateEdu(item.id, { location: e.target.value })}
              />
            </Field>
            <Field label="Detail">
              <input value={item.detail} onChange={(e) => updateEdu(item.id, { detail: e.target.value })} />
            </Field>
          </div>
        ))}
      </section>

      {/* Skills */}
      <section className="form-section">
        <h2>
          Skills
          <button type="button" className="btn-mini" onClick={addSkill}>
            + Add
          </button>
        </h2>
        {data.skills.map((g, i) => (
          <div className="card" key={g.id}>
            <div className="card-head">
              <span className="idx">#{i + 1}</span>
              <button
                type="button"
                className="btn-mini danger"
                onClick={() => removeSkill(g.id)}
                aria-label={`Remove skill group ${i + 1}`}
              >
                Remove
              </button>
            </div>
            <Field label="Category">
              <input value={g.label} onChange={(e) => updateSkill(g.id, { label: e.target.value })} />
            </Field>
            <Field label="Items (comma-separated)">
              {/* Lossless split/join: split on "," and join on "," is an exact
                  inverse, so the field shows exactly what was typed (including
                  the user's own spacing) with no caret jumps. Trimming/empty
                  filtering happens at render time. */}
              <input
                value={g.items.join(",")}
                onChange={(e) => updateSkill(g.id, { items: e.target.value.split(",") })}
              />
            </Field>
          </div>
        ))}
      </section>
    </form>
  );
}
