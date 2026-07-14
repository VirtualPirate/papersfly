/**
 * The cover-letter CONTENT, fully decoupled from the DESIGN.
 *
 * Same contract as resume.ts: a template turns this plain data into an
 * HTML/CSS preview, and that same rendered markup is what doc.html() exports.
 * The sender identity block reuses the resume's ContactInfo shape.
 */
import type { ContactInfo } from "./resume";

export interface CoverLetterRecipient {
  name: string;
  title: string;
  company: string;
  /** One line, e.g. "550 Congress Ave, Austin, TX 78701". */
  address: string;
}

export interface CoverLetterParagraph {
  id: string;
  text: string;
}

export interface CoverLetterData {
  name: string;
  headline: string;
  contact: ContactInfo;
  /** Free text — there is no date-picker control. */
  date: string;
  recipient: CoverLetterRecipient;
  /** The "Re:" line WITHOUT any prefix — each template renders its own label. Empty ⇒ hidden. */
  subject: string;
  salutation: string;
  paragraphs: CoverLetterParagraph[];
  closing: string;
  /** Typed signature name (usually the full name). */
  signature: string;
}

export const sampleCoverLetter: CoverLetterData = {
  name: "Jordan Avery Chen",
  headline: "Senior Software Engineer",
  contact: {
    email: "jordan.chen@example.com",
    phone: "(415) 555-0148",
    location: "San Francisco, CA",
    website: "jordanchen.dev",
    linkedin: "linkedin.com/in/jordanchen",
  },
  date: "July 14, 2026",
  recipient: {
    name: "Priya Raman",
    title: "Director of Engineering",
    company: "Lumenware",
    address: "550 Congress Ave, Austin, TX 78701",
  },
  subject: "Staff Software Engineer, Platform (Req. ENG-4127)",
  salutation: "Dear Ms. Raman,",
  paragraphs: [
    {
      id: "para-1",
      text:
        "I’m writing to apply for the Staff Software Engineer opening on Lumenware’s Platform team. " +
        "For nine years I’ve built the systems other teams stand on — billing, data infrastructure, " +
        "and the APIs between them — and your charter of turning usage metering into a product every " +
        "team can trust reads like a description of the work I most want to do.",
    },
    {
      id: "para-2",
      text:
        "At Northwind Labs I led the re-architecture of our billing platform to an event-sourced model, " +
        "which cut reconciliation incidents by 92% and made same-day refunds possible for the first time. " +
        "Along the way my team drove a query and caching overhaul that brought p99 API latency from 840ms " +
        "down to 190ms while traffic doubled — the kind of result that only happens when platform and " +
        "product engineers plan the work together.",
    },
    {
      id: "para-3",
      text:
        "Just as important to me is how a team ships. I mentor a group of six engineers and introduced a " +
        "lightweight RFC process that cut our design-to-merge time from three weeks to eight days. I’d " +
        "welcome the chance to talk about what Lumenware’s platform needs next — my resume is attached, " +
        "and I’m reachable any afternoon, Pacific time.",
    },
  ],
  closing: "Sincerely,",
  signature: "Jordan Avery Chen",
};
