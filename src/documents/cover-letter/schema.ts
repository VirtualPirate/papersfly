import { builder, type FormSchema } from "../../forms/schema";
import type { CoverLetterData, CoverLetterParagraph } from "../../data/coverLetter";

export const makeBlankParagraph = (): Omit<CoverLetterParagraph, "id"> => ({ text: "" });

const b = builder<CoverLetterData>();

export const coverLetterSchema: FormSchema<CoverLetterData> = [
  b.section("Sender", [
    b.field("name", "Full name"),
    b.field("headline", "Headline"),
    b.group("contact", (c) => [
      c.row(c.field("email", "Email"), c.field("phone", "Phone")),
      c.row(c.field("location", "Location"), c.field("website", "Website")),
      c.field("linkedin", "LinkedIn"),
    ]),
  ]),
  b.section("Recipient", [
    b.field("date", "Date"),
    b.group("recipient", (r) => [
      r.row(r.field("name", "Name"), r.field("title", "Title")),
      r.field("company", "Company"),
      r.field("address", "Address"),
    ]),
    b.field("subject", "Subject (Re: line)", { control: "text", placeholder: "Leave blank to omit" }),
  ]),
  b.section("Letter", [b.field("salutation", "Salutation")]),
  b.list("paragraphs", "Paragraphs", makeBlankParagraph, (p) => [
    p.textarea("text", "Paragraph", { rows: 4 }),
  ]),
  b.section("Sign-off", [
    b.row(b.field("closing", "Closing"), b.field("signature", "Signature name")),
  ]),
];
