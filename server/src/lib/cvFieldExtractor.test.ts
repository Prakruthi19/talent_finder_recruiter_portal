import { describe, expect, it } from "vitest";
import { extractCandidateFields } from "./cvFieldExtractor";

const KNOWN_SKILLS = ["react", "node.js", "sql", "python", "aws", "docker"];
const NOW = new Date("2026-09-21");

describe("extractCandidateFields", () => {
  it("extracts an email address from the CV text", () => {
    const result = extractCandidateFields("Jane Doe\njane.doe@example.com\n+1 555 123 4567", KNOWN_SKILLS);
    expect(result.email).toBe("jane.doe@example.com");
  });

  it("lowercases the email and cuts off a glued-on neighbouring field (a common PDF artefact)", () => {
    const result = extractCandidateFields("Email: Jane.Doe@Example.comPhone: 555 123 4567", KNOWN_SKILLS);
    expect(result.email).toBe("jane.doe@example.com");
  });

  it("extracts a phone number from the CV text", () => {
    const result = extractCandidateFields("Contact: +1 555 123 4567", KNOWN_SKILLS);
    expect(result.phone).toContain("555");
  });

  it("does not mistake a year range for a phone number", () => {
    const result = extractCandidateFields("Worked 2015 - 2019 at Acme, 2019 - 2023 at Beta", KNOWN_SKILLS);
    expect(result.phone).toBeUndefined();
  });

  it("extracts years of experience from a common phrasing", () => {
    const result = extractCandidateFields("Software engineer with 5 years of experience building web apps.", KNOWN_SKILLS);
    expect(result.experienceYears).toBe(5);
  });

  it("extracts years of experience from a '5+ yrs exp' style phrasing", () => {
    const result = extractCandidateFields("5+ yrs exp in backend development", KNOWN_SKILLS);
    expect(result.experienceYears).toBe(5);
  });

  it("leaves experienceYears undefined when there is nothing to go on", () => {
    const result = extractCandidateFields("A candidate with strong skills.", KNOWN_SKILLS);
    expect(result.experienceYears).toBeUndefined();
  });

  it("exact-matches known skills that appear verbatim in the text", () => {
    const result = extractCandidateFields("Experienced with React, SQL and Python in production.", KNOWN_SKILLS);
    expect(result.skills).toEqual(expect.arrayContaining(["react", "sql", "python"]));
    expect(result.skills).not.toContain("aws");
  });

  it("does not return skills that never appear in the text at all", () => {
    const result = extractCandidateFields("Just a generic resume with no tech mentioned.", KNOWN_SKILLS);
    expect(result.skills).not.toContain("docker");
    expect(result.skills).not.toContain("aws");
  });

  it("does not fuzzy-match unrelated short words to unrelated skill names (regression: 'India' vs 'django')", () => {
    const result = extractCandidateFields("Jane Doe, Bangalore, India. Software engineer.", [...KNOWN_SKILLS, "django"]);
    expect(result.skills).not.toContain("django");
  });

  it("returns no skills when there are no known skills to match against", () => {
    const result = extractCandidateFields("React, SQL, Python", []);
    expect(result.skills).toEqual([]);
  });

  it("handles empty text without throwing", () => {
    const result = extractCandidateFields("", KNOWN_SKILLS);
    expect(result.email).toBeUndefined();
    expect(result.phone).toBeUndefined();
    expect(result.experienceYears).toBeUndefined();
    expect(result.skills).toEqual([]);
    expect(result.suggestedSkills).toEqual([]);
  });

  describe("name", () => {
    it("takes the name from the top of the CV", () => {
      expect(extractCandidateFields("Priya Sharma\nSenior Software Engineer\npriya@x.com", KNOWN_SKILLS).fullName).toBe("Priya Sharma");
    });

    it("title-cases an ALL CAPS header", () => {
      expect(extractCandidateFields("PRIYA SHARMA\npriya@x.com", KNOWN_SKILLS).fullName).toBe("Priya Sharma");
    });

    it("skips headings, job titles and contact lines that are not a name", () => {
      const text = "Curriculum Vitae\nSenior Software Engineer\n+1 555 123 4567\nAsha Menon\nBellevue, WA";
      expect(extractCandidateFields(text, KNOWN_SKILLS).fullName).toBe("Asha Menon");
    });

    it("falls back to the email when a letter-spaced heading lost its word gap", () => {
      const text = "P R I Y A S H A R M A\nSoftware Engineer\npriya.sharma@example.com";
      expect(extractCandidateFields(text, KNOWN_SKILLS).fullName).toBe("Priya Sharma");
    });

    it("does not invent a name from prose", () => {
      expect(extractCandidateFields("experienced engineer looking for a new role", KNOWN_SKILLS).fullName).toBeUndefined();
    });
  });

  describe("location", () => {
    it("finds a 'City, ST' header such as Bellevue, WA", () => {
      expect(extractCandidateFields("Asha Menon\nBellevue, WA | asha@x.com", KNOWN_SKILLS).location).toBe("Bellevue, WA");
    });

    it("finds a 'City, Country' header", () => {
      expect(extractCandidateFields("Ravi K\nPune, India\nravi@x.com", KNOWN_SKILLS).location).toBe("Pune, India");
    });

    it("prefers an explicit Location: label", () => {
      expect(extractCandidateFields("Ravi K\nLocation: Hyderabad | Open to relocate", KNOWN_SKILLS).location).toBe("Hyderabad");
    });

    it("recognises a known city on its own", () => {
      expect(extractCandidateFields("Ravi K\nbangalore\nravi@x.com", KNOWN_SKILLS).location).toBe("Bangalore");
    });

    it("does not tack ordinary words onto a city", () => {
      expect(extractCandidateFields("Ravi K\nMumbai, working remotely", KNOWN_SKILLS).location).toBe("Mumbai");
    });

    it("keeps the state or country that follows a known city", () => {
      expect(extractCandidateFields("Priya S\nBengaluru, Karnataka | priya@x.com", KNOWN_SKILLS).location).toBe("Bengaluru, Karnataka");
    });
  });

  describe("experience from employment dates", () => {
    it("adds up jobs without double counting an overlap", () => {
      const text = "Experience\nEngineer, Acme  Jan 2018 - Dec 2019\nSenior Engineer, Beta  Jul 2019 - Dec 2021\nEducation\nBSc  2010 - 2014";
      // Jan 2018 .. Dec 2021 = 4 years; the 2010-2014 degree is not work.
      expect(extractCandidateFields(text, KNOWN_SKILLS, { now: NOW }).experienceYears).toBe(4);
    });

    it("counts a current job up to today", () => {
      const text = "Work Experience\nDeveloper, Acme  Jan 2024 - Present";
      // Jan 2024 .. Jun 2026 inclusive = 30 months = 2.5 years
      expect(extractCandidateFields(text, KNOWN_SKILLS, { now: new Date("2026-06-21") }).experienceYears).toBe(2.5);
    });

    it("prefers a stated total over the dates", () => {
      const text = "10+ years of experience.\nExperience\nDev  Jan 2023 - Present";
      expect(extractCandidateFields(text, KNOWN_SKILLS, { now: NOW }).experienceYears).toBe(10);
    });
  });

  describe("skills", () => {
    it("does not find 'java' inside 'javascript' or 'sql' inside 'postgresql'", () => {
      const result = extractCandidateFields("Skills: JavaScript and PostgreSQL", ["java", "javascript", "sql", "postgresql"]);
      expect(result.skills.sort()).toEqual(["javascript", "postgresql"]);
    });

    it("recognises common spellings of a known skill", () => {
      const result = extractCandidateFields("Built apps with Reactjs, Node JS and k8s", ["react", "node.js", "kubernetes"]);
      expect(result.skills.sort()).toEqual(["kubernetes", "node.js", "react"]);
    });

    it("catches a typo, but not an unrelated word", () => {
      expect(extractCandidateFields("Wrote Typescirpt daily", ["typescript"]).skills).toEqual(["typescript"]);
      expect(extractCandidateFields("Reactive systems", ["react"]).skills).toEqual([]);
    });

    it("suggests skills from the Skills section that the database does not know yet", () => {
      const text = "Skills\nPython, Rust, Kotlin | Docker\nExperience\nDev at Acme";
      const result = extractCandidateFields(text, KNOWN_SKILLS);
      expect(result.skills.sort()).toEqual(["docker", "python"]);
      expect(result.suggestedSkills.sort()).toEqual(["kotlin", "rust"]);
    });

    it("suggests nothing from prose outside a Skills section", () => {
      const result = extractCandidateFields("I really enjoy Rust and Kotlin at work.", KNOWN_SKILLS);
      expect(result.suggestedSkills).toEqual([]);
    });
  });
});
