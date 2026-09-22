import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { CvReadError, extractCvText } from "./cvTextExtractor";

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"';
const paragraph = (text: string) => `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`;

/** A minimal but valid .docx, with a chosen body, page header and text box. */
async function buildDocx(parts: { body: string; header?: string; textBox?: string }): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      "</Types>"
  );
  zip.file(
    "_rels/.rels",
    '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      "</Relationships>"
  );
  const textBox = parts.textBox
    ? `<w:p><w:r><mc:AlternateContent xmlns:mc="x"><mc:Choice><w:txbxContent>${paragraph(parts.textBox)}</w:txbxContent></mc:Choice>` +
      `<mc:Fallback><w:txbxContent>${paragraph(parts.textBox)}</w:txbxContent></mc:Fallback></mc:AlternateContent></w:r></w:p>`
    : "";
  zip.file("word/document.xml", `<?xml version="1.0"?><w:document ${W}><w:body>${parts.body}${textBox}</w:body></w:document>`);
  if (parts.header) zip.file("word/header1.xml", `<?xml version="1.0"?><w:hdr ${W}>${parts.header}</w:hdr>`);
  return zip.generateAsync({ type: "nodebuffer" });
}

describe("extractCvText (docx)", () => {
  it("reads the body", async () => {
    const text = await extractCvText(await buildDocx({ body: paragraph("Skills: Python") }), "docx");
    expect(text).toContain("Skills: Python");
  });

  it("also reads the page header, where many resumes keep the name and contact details", async () => {
    const buffer = await buildDocx({ body: paragraph("Experience"), header: paragraph("Priya Sharma") + paragraph("priya@example.com") });
    const text = await extractCvText(buffer, "docx");
    expect(text).toContain("Priya Sharma");
    expect(text).toContain("priya@example.com");
    // The header is put first, as it is on the printed page.
    expect(text.indexOf("Priya Sharma")).toBeLessThan(text.indexOf("Experience"));
  });

  it("reads text boxes, once (they are stored twice in the file)", async () => {
    const text = await extractCvText(await buildDocx({ body: paragraph("Body"), textBox: "Bellevue, WA" }), "docx");
    expect(text.match(/Bellevue, WA/g)).toHaveLength(1);
  });

  it("reports a damaged file as a CvReadError instead of a generic crash", async () => {
    await expect(extractCvText(Buffer.from("this is not a zip"), "docx")).rejects.toMatchObject({
      constructor: CvReadError,
      reason: "corrupt",
    });
    await expect(extractCvText(Buffer.from("not a pdf"), "pdf")).rejects.toBeInstanceOf(CvReadError);
  });

  describe("zip bomb guards", () => {
    it("rejects a .docx with an unreasonable number of entries, before decompressing anything", async () => {
      const zip = new JSZip();
      zip.file("word/document.xml", `<?xml version="1.0"?><w:document ${W}><w:body>${paragraph("x")}</w:body></w:document>`);
      for (let i = 0; i < 2001; i++) zip.file(`junk/${i}.txt`, "x");
      const buffer = await zip.generateAsync({ type: "nodebuffer" });

      await expect(extractCvText(buffer, "docx")).rejects.toMatchObject({ constructor: CvReadError, reason: "corrupt" });
    });

    it("rejects a single entry that decompresses far beyond a real resume's size", async () => {
      // A real zip bomb: a few MB of highly-compressible repeated bytes that inflate to
      // tens of MB. DEFLATE compresses this so well the *input* buffer stays tiny.
      const buffer = await buildDocx({ body: paragraph("cover text"), header: paragraph("A".repeat(6_000_000)) });

      await expect(extractCvText(buffer, "docx")).rejects.toMatchObject({ constructor: CvReadError, reason: "corrupt" });
    });

    it("does not reject an ordinary resume-sized .docx", async () => {
      const text = await extractCvText(await buildDocx({ body: paragraph("A perfectly normal resume.") }), "docx");
      expect(text).toContain("A perfectly normal resume.");
    });
  });
});
