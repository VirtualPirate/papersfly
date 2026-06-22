/**
 * The resume CONTENT, fully decoupled from the DESIGN.
 *
 * A template turns this plain data into (a) an HTML/CSS preview and (b) a
 * vector PDF. Editing the data in the form updates `ResumeData` in React state,
 * which re-renders the preview live and feeds the PDF writer on download.
 */

export interface ContactInfo {
  email: string;
  phone: string;
  location: string;
  website: string;
  linkedin: string;
}

export interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  location: string;
  start: string;
  end: string;
  bullets: string[];
}

export interface EducationItem {
  id: string;
  institution: string;
  degree: string;
  location: string;
  start: string;
  end: string;
  detail: string;
}

export interface SkillGroup {
  id: string;
  label: string;
  items: string[];
}

export interface ResumeData {
  name: string;
  headline: string;
  contact: ContactInfo;
  summary: string;
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: SkillGroup[];
}

export const sampleResume: ResumeData = {
  name: "Jordan Avery Chen",
  headline: "Senior Software Engineer",
  contact: {
    email: "jordan.chen@example.com",
    phone: "(415) 555-0148",
    location: "San Francisco, CA",
    website: "jordanchen.dev",
    linkedin: "linkedin.com/in/jordanchen",
  },
  summary:
    "Senior engineer with 9+ years building reliable, high-traffic web platforms. " +
    "I lead small teams from ambiguous problem to shipped product, care deeply about " +
    "developer experience, and have a track record of cutting latency and cost while " +
    "raising reliability. Equally comfortable in the data layer and on the design system.",
  experience: [
    {
      id: "exp-1",
      role: "Staff Software Engineer",
      company: "Northwind Labs",
      location: "San Francisco, CA",
      start: "2021",
      end: "Present",
      bullets: [
        "Led the re-architecture of the billing platform to an event-sourced model, cutting reconciliation incidents by 92% and unlocking same-day refunds.",
        "Mentored a team of 6 engineers; introduced a lightweight RFC process that shortened design-to-merge time from 3 weeks to 8 days.",
        "Drove a query and caching overhaul that reduced p99 API latency from 840ms to 190ms at 2x traffic.",
      ],
    },
    {
      id: "exp-2",
      role: "Senior Software Engineer",
      company: "Brightwave",
      location: "Remote",
      start: "2018",
      end: "2021",
      bullets: [
        "Built the real-time collaboration engine (operational transforms) powering documents for 400k+ daily users.",
        "Owned the migration from a monolith to 7 well-bounded services with zero customer-facing downtime.",
        "Established the frontend performance budget; trimmed initial bundle by 38% and improved LCP to under 1.5s.",
      ],
    },
    {
      id: "exp-3",
      role: "Software Engineer",
      company: "Cobalt Systems",
      location: "Austin, TX",
      start: "2015",
      end: "2018",
      bullets: [
        "Shipped the public REST and webhook APIs now used by 1,200+ integration partners.",
        "Added end-to-end tracing and SLO dashboards that became the team's incident-response backbone.",
      ],
    },
  ],
  education: [
    {
      id: "edu-1",
      institution: "University of California, Berkeley",
      degree: "B.S. in Electrical Engineering & Computer Science",
      location: "Berkeley, CA",
      start: "2011",
      end: "2015",
      detail: "Graduated with honors. Teaching assistant for Data Structures (CS 61B).",
    },
  ],
  skills: [
    {
      id: "sk-1",
      label: "Languages",
      items: ["TypeScript", "Go", "Python", "Rust", "SQL"],
    },
    {
      id: "sk-2",
      label: "Frameworks & Tools",
      items: ["React", "Node.js", "PostgreSQL", "Kafka", "Kubernetes", "Terraform"],
    },
    {
      id: "sk-3",
      label: "Practices",
      items: ["Distributed systems", "Observability", "Design systems", "Mentorship"],
    },
  ],
};
