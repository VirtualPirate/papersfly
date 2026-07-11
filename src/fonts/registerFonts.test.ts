import { describe, it, expect, vi } from "vitest";
import { registerFonts, pdfFontFacesFor } from "./registerFonts";
import type { jsPDF } from "jspdf";

function fakeDoc() {
  return { addFileToVFS: vi.fn(), addFont: vi.fn() } as unknown as jsPDF;
}

describe("registerFonts", () => {
  it("embeds only the used families (all their weights)", async () => {
    const doc = fakeDoc();
    await registerFonts(doc, ["inter", "sourceSerif"]);
    // 2 families × 3 weights = 6 VFS additions.
    expect(doc.addFileToVFS).toHaveBeenCalledTimes(6);
    expect(doc.addFileToVFS).toHaveBeenCalledWith("inter-bold.ttf", expect.any(String));
    // Lora is not used → never embedded.
    const files = (doc.addFileToVFS as any).mock.calls.map((c: any[]) => c[0]);
    expect(files).not.toContain("lora-regular.ttf");
  });

  it("uses each file name as both VFS key and addFont path (invariant)", async () => {
    const doc = fakeDoc();
    await registerFonts(doc, ["inter"]);
    const vfsKeys = (doc.addFileToVFS as any).mock.calls.map((c: any[]) => c[0]);
    const fontPaths = (doc.addFont as any).mock.calls.map((c: any[]) => c[0]);
    expect(new Set(fontPaths)).toEqual(new Set(vfsKeys));
  });
});

describe("pdfFontFacesFor", () => {
  it("returns one face per used family weight, src.url === file", () => {
    const faces = pdfFontFacesFor(["lora"]);
    expect(faces).toHaveLength(3);
    expect(faces.map((f) => f.weight).sort()).toEqual([400, 600, 700]);
    for (const f of faces) {
      expect(f.family).toBe("Lora");
      expect(f.src[0].format).toBe("truetype");
      expect(f.src[0].url).toMatch(/^lora-.*\.ttf$/);
    }
  });
});
