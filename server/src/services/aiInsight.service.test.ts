import { describe, expect, it, vi, beforeEach } from "vitest";
import { NotFoundError } from "../lib/errors";

const findCandidateById = vi.fn();
const findJobOrderById = vi.fn();
const generateChatCompletion = vi.fn();

vi.mock("../repositories/candidate.repository", () => ({
  candidateRepository: { findById: (...args: unknown[]) => findCandidateById(...args) },
}));
vi.mock("../repositories/jobOrder.repository", () => ({
  jobOrderRepository: { findById: (...args: unknown[]) => findJobOrderById(...args) },
}));
vi.mock("../lib/aiProvider", () => ({
  generateChatCompletion: (...args: unknown[]) => generateChatCompletion(...args),
}));

// Imported after the mocks above so the service picks up the mocked modules.
const { aiInsightService } = await import("./aiInsight.service");

function skill(name: string) {
  return { skill: { id: name, name } };
}

describe("aiInsightService.generateMatchInsight", () => {
  beforeEach(() => {
    findCandidateById.mockReset();
    findJobOrderById.mockReset();
    generateChatCompletion.mockReset();
  });

  it("throws NotFoundError when the job order isn't in this tenant", async () => {
    findJobOrderById.mockResolvedValue(null);
    findCandidateById.mockResolvedValue({ id: "c1" });

    await expect(
      aiInsightService.generateMatchInsight("tenant-1", "job-1", "cand-1")
    ).rejects.toThrow(NotFoundError);
  });

  it("throws NotFoundError when the candidate isn't in this tenant", async () => {
    findJobOrderById.mockResolvedValue({ id: "job-1", requiredSkills: [] });
    findCandidateById.mockResolvedValue(null);

    await expect(
      aiInsightService.generateMatchInsight("tenant-1", "job-1", "cand-1")
    ).rejects.toThrow(NotFoundError);
  });

  it("builds a prompt from matched/missing skills and returns the AI response", async () => {
    findJobOrderById.mockResolvedValue({
      id: "job-1",
      title: "Backend Engineer",
      minExperience: "3",
      requiredSkills: [skill("node.js"), skill("sql"), skill("aws")],
    });
    findCandidateById.mockResolvedValue({
      id: "cand-1",
      fullName: "Jane Doe",
      experienceYears: "5",
      location: "Bangalore",
      skills: [skill("node.js"), skill("react")],
    });
    generateChatCompletion.mockResolvedValue("Jane is a strong fit for the node.js requirement.");

    const result = await aiInsightService.generateMatchInsight("tenant-1", "job-1", "cand-1");

    expect(result).toEqual({ insight: "Jane is a strong fit for the node.js requirement." });
    expect(generateChatCompletion).toHaveBeenCalledTimes(1);

    const [messages] = generateChatCompletion.mock.calls[0] as [{ role: string; content: string }[]];
    const userMessage = messages.find((m) => m.role === "user")!.content;
    expect(userMessage).toContain("Jane Doe");
    expect(userMessage).toContain("Matched required skills: node.js");
    expect(userMessage).toContain("Missing required skills: sql, aws");
  });
});
