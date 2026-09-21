import { describe, expect, it } from "vitest";
import { MIN_READABLE_LETTERS, normalizeCvText, textStats } from "./cvTextNormalizer";

describe("normalizeCvText", () => {
  it("removes PDF page markers", () => {
    expect(normalizeCvText("Jane Doe\n-- 1 of 2 --\nEngineer\n-- 2 of 2 --")).toBe("Jane Doe\nEngineer");
  });

  it("folds ligatures, non-breaking spaces and zero-width characters", () => {
    expect(normalizeCvText("ﬁnance analyst​")).toBe("finance analyst");
  });

  it("puts bullets on their own lines", () => {
    expect(normalizeCvText("Skills • Python • Java")).toBe("Skills\n- Python\n- Java");
  });

  it("repairs letter-spaced headings but leaves normal text alone", () => {
    expect(normalizeCvText("S K I L L S")).toBe("SKILLS");
    expect(normalizeCvText("J O H N   D O E")).toBe("JOHN DOE");
    expect(normalizeCvText("Built a 3 D engine")).toBe("Built a 3 D engine");
  });

  it("re-joins words hyphenated by line wrapping", () => {
    expect(normalizeCvText("Responsible for develop-\nment of APIs")).toBe("Responsible for development of APIs");
  });

  it("is idempotent", () => {
    const once = normalizeCvText("A  B\n\n\n\nS K I L L S\n• x");
    expect(normalizeCvText(once)).toBe(once);
  });
});

describe("textStats", () => {
  it("counts letters, not punctuation or whitespace", () => {
    // "12" is not a word: words start with a letter.
    expect(textStats("ab, cd!  12")).toEqual({ characters: 11, letters: 4, words: 2 });
  });

  it("puts the readable threshold in letters", () => {
    expect(MIN_READABLE_LETTERS).toBe(40);
  });
});
