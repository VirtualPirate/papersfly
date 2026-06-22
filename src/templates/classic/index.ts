import type { Template } from "../types";
import { ClassicPreview } from "./ClassicPreview";
import { classicToPdf } from "./classicPdf";

export const classicTemplate: Template = {
  id: "classic",
  name: "Classic",
  Preview: ClassicPreview,
  toPdf: classicToPdf,
};
