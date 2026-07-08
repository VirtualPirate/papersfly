import { builder, type FormSchema } from "../../forms/schema";
import type {
  EducationItem,
  ExperienceItem,
  ResumeData,
  SkillGroup,
} from "../../data/resume";

/** Defaults for "+ Add" — copied verbatim from the original EditorForm. */
export const makeBlankExperience = (): Omit<ExperienceItem, "id"> => ({
  role: "Job Title",
  company: "Company",
  location: "",
  start: "20XX",
  end: "Present",
  bullets: ["Describe an accomplishment with measurable impact."],
});

export const makeBlankEducation = (): Omit<EducationItem, "id"> => ({
  institution: "Institution",
  degree: "Degree",
  location: "",
  start: "20XX",
  end: "20XX",
  detail: "",
});

export const makeBlankSkill = (): Omit<SkillGroup, "id"> => ({
  label: "Category",
  items: [],
});

const b = builder<ResumeData>();

export const resumeSchema: FormSchema<ResumeData> = [
  b.section("Basics", [
    b.field("name", "Full name"),
    b.field("headline", "Headline"),
    b.group("contact", (c) => [
      c.row(c.field("email", "Email"), c.field("phone", "Phone")),
      c.row(c.field("location", "Location"), c.field("website", "Website")),
      c.field("linkedin", "LinkedIn"),
    ]),
  ]),
  b.section("Summary", [b.textarea("summary", "Professional summary", { rows: 4 })]),
  b.list("experience", "Experience", makeBlankExperience, (e) => [
    e.field("role", "Role"),
    e.row(e.field("company", "Company"), e.field("location", "Location")),
    e.row(e.field("start", "Start"), e.field("end", "End")),
    e.lines("bullets", "Bullets (one per line)", { rows: 4 }),
  ]),
  b.list("education", "Education", makeBlankEducation, (ed) => [
    ed.field("institution", "Institution"),
    ed.field("degree", "Degree"),
    ed.row(ed.field("start", "Start"), ed.field("end", "End")),
    ed.field("location", "Location"),
    ed.field("detail", "Detail"),
  ]),
  b.list("skills", "Skills", makeBlankSkill, (s) => [
    s.field("label", "Category"),
    s.tags("items", "Items (comma-separated)"),
  ]),
];
