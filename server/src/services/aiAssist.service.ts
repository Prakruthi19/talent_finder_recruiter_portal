import fs from "node:fs/promises";
import { z } from "zod";
import { generateChatCompletion } from "../lib/aiProvider";
import { generateJson, untrusted, untrustedNote } from "../lib/aiJson";
import { canonicalSkill } from "../lib/cvSkillMatcher";
import { verifyCvFileType } from "../lib/fileTypeCheck";
import { extractCvText } from "../lib/cvTextExtractor";
import { normalizeCvText } from "../lib/cvTextNormalizer";
import { redactPii } from "../lib/redact";
import { NotFoundError } from "../lib/errors";
import { candidateRepository } from "../repositories/candidate.repository";
import { skillRepository } from "../repositories/skill.repository";
import { userRepository } from "../repositories/user.repository";
import { dashboardRepository } from "../repositories/dashboard.repository";
import { interviewRepository } from "../repositories/interview.repository";
import { submissionRepository } from "../repositories/submission.repository";
import { loadMatchContext } from "./matchContext";
import { dashboardService } from "./dashboard.service";

// Every field falls back to "missing" by itself, so one bad value from the
// model never discards the rest of an otherwise good answer.
const optional = <T extends z.ZodTypeAny>(schema: T) => schema.nullish().catch(undefined);
const skillList = (max: number) => z.array(z.string().trim().min(1).max(40)).max(max).catch([]);

const CANDIDATE_NAME = "{{candidate_name}}";
const RECRUITER_NAME = "{{recruiter_name}}";
// Only the recruiter's own words are in the prompt: the candidate's name, email
// and phone are never sent. The model writes placeholders; we fill them in.
const fill = (text: string, values: Record<string, string>) =>
  Object.entries(values).reduce((out, [token, value]) => out.split(token).join(value), text);

const jobDescriptionSchema = z.object({
  title: optional(z.string().trim().min(1).max(160)),
  clientName: optional(z.string().trim().min(1).max(160)),
  location: optional(z.string().trim().min(1).max(160)),
  minExperience: optional(z.number().min(0).max(60)),
  numberOfOpenings: optional(z.number().int().min(1).max(500)),
  skills: skillList(40),
});

const outreachDraftSchema = z.object({
  subject: z.string().trim().min(3).max(150),
  body: z.string().trim().min(20).max(1500),
});

const interviewQuestionsSchema = z.object({
  questions: z.array(z.string().trim().min(8).max(300)).min(3).max(8),
});

const searchFiltersSchema = z.object({
  skills: skillList(8),
  location: optional(z.string().trim().min(1).max(100)),
  minExperience: optional(z.number().min(0).max(60)),
  maxExperience: optional(z.number().min(0).max(60)),
  nameContains: optional(z.string().trim().min(1).max(80)),
});

const today = () => new Date().toISOString().slice(0, 10);

export const aiAssistService = {
  /**
   * "Paste a job description, get a job order to review". Skills are mapped onto
   * the names already in the database (so the exact-match ranking still works)
   * and anything unrecognised is offered as a suggestion, never added silently.
   */
  async parseJobDescription(text: string) {
    const known = await skillRepository.findAllNames();
    const raw = await generateJson(
      [
        {
          role: "system",
          content:
            "You turn a job description into a job order. Reply with ONLY one JSON object with the keys " +
            '"title", "clientName" (the hiring company, if named), "location" (city/region, or "Remote"), ' +
            '"minExperience" (number: minimum years of experience required, 0 if not stated), ' +
            '"numberOfOpenings" (integer, 1 if not stated) and "skills" (short lowercase names of the technical ' +
            "and professional skills the role requires). Use null for anything not stated. Do not guess. " +
            untrustedNote("job_description"),
        },
        {
          role: "user",
          content:
            `Known skills (use exactly these names when the description mentions them): ${known.slice(0, 200).join(", ")}\n\n` +
            untrusted("job_description", text, 12000),
        },
      ],
      jobDescriptionSchema,
      { maxTokens: 600 }
    );

    const skills = new Set<string>();
    const suggested = new Set<string>();
    for (const skill of raw.skills) {
      const canonical = canonicalSkill(skill, known);
      if (canonical) skills.add(canonical);
      else suggested.add(skill.toLowerCase());
    }
    return {
      title: raw.title ?? undefined,
      clientName: raw.clientName ?? undefined,
      location: raw.location ?? undefined,
      minExperience: raw.minExperience ?? undefined,
      numberOfOpenings: raw.numberOfOpenings ?? undefined,
      skills: [...skills],
      suggestedSkills: [...suggested].slice(0, 15),
    };
  },

  /** A neutral recruiter-facing summary. Name and contact details are removed before anything is sent. */
  async summarizeCandidate(tenantId: string, candidateId: string) {
    const candidate = await candidateRepository.findById(tenantId, candidateId);
    if (!candidate) throw new NotFoundError("Candidate");

    let cvText = "";
    if (candidate.cvPath) {
      try {
        const buffer = await fs.readFile(candidate.cvPath);
        const kind = await verifyCvFileType(buffer);
        cvText = redactPii(normalizeCvText(await extractCvText(buffer, kind)), candidate.fullName);
      } catch {
        // No readable CV: the summary is built from the profile fields alone.
      }
    }

    const facts = [
      `Total experience: ${candidate.experienceYears.toString()} years`,
      `Location: ${candidate.location ?? "not stated"}`,
      `Skills: ${candidate.skills.map((s) => s.skill.name).join(", ") || "none listed"}`,
      `Shortlisted for: ${candidate.submissions.map((s) => `${s.jobOrder.title} (${s.status})`).join("; ") || "nothing yet"}`,
    ].join("\n");

    const summary = await generateChatCompletion(
      [
        {
          role: "system",
          content:
            "You write a neutral 3-4 sentence professional summary of a job candidate for a recruiter, using only " +
            "the facts and the CV excerpt provided. Refer to them as 'the candidate'. Do not invent employers, " +
            "degrees or dates. No markdown, no bullet points. " +
            untrustedNote("cv"),
        },
        { role: "user", content: facts + (cvText ? `\n\nCV excerpt:\n${untrusted("cv", cvText, 5000)}` : "") },
      ],
      { maxTokens: 250, temperature: 0.3 }
    );
    return { summary, usedCv: cvText.length > 0 };
  },

  /** A short first-contact message a recruiter can edit and send. Never sent by the app. */
  async draftOutreach(
    tenantId: string,
    userId: string,
    jobOrderId: string,
    candidateId: string,
    tone: "friendly" | "formal"
  ) {
    const { jobOrder, candidate, matchedSkillNames } = await loadMatchContext(tenantId, jobOrderId, candidateId);
    const recruiter = await userRepository.findById(userId);

    const draft = await generateJson(
      [
        {
          role: "system",
          content:
            `You write a short (90-140 words), ${tone} first-contact email from a recruiter to a job candidate about a role. ` +
            `Address the candidate as ${CANDIDATE_NAME} and sign off as ${RECRUITER_NAME}; use those two placeholders exactly. ` +
            "Only mention the facts provided. Do not mention salary, and do not promise anything. " +
            'Reply with ONLY one JSON object: {"subject": "...", "body": "..."}. Plain text, no markdown.',
        },
        {
          role: "user",
          content: [
            `Role: ${jobOrder.title}${jobOrder.clientName ? ` at ${jobOrder.clientName}` : ""}, ${jobOrder.location}.`,
            `Why they fit (skills in common with the role): ${matchedSkillNames.join(", ") || "general background"}.`,
            `They have about ${candidate.experienceYears.toString()} years of experience.`,
          ].join("\n"),
        },
      ],
      outreachDraftSchema,
      { maxTokens: 500, temperature: 0.5 }
    );

    const values = { [CANDIDATE_NAME]: candidate.fullName, [RECRUITER_NAME]: recruiter?.name ?? "The recruiting team" };
    return { subject: fill(draft.subject, values), body: fill(draft.body, values) };
  },

  /** Interview questions aimed at the gaps and strengths of this particular pairing. */
  async interviewQuestions(tenantId: string, jobOrderId: string, candidateId: string) {
    const { jobOrder, candidate, matchedSkillNames, missingSkillNames } = await loadMatchContext(
      tenantId,
      jobOrderId,
      candidateId
    );
    const result = await generateJson(
      [
        {
          role: "system",
          content:
            "You suggest 5 concrete interview questions for one candidate and one role. Cover a mix: probe the " +
            "strengths they claim, and explore the required skills they lack. Reply with ONLY one JSON object: " +
            '{"questions": ["...", "..."]}. Plain text, no numbering, no markdown.',
        },
        {
          role: "user",
          content: [
            `Role: ${jobOrder.title} (needs ${jobOrder.minExperience.toString()}+ years).`,
            `Candidate: ${candidate.experienceYears.toString()} years of experience.`,
            `Required skills they have: ${matchedSkillNames.join(", ") || "none"}.`,
            `Required skills they lack: ${missingSkillNames.join(", ") || "none"}.`,
          ].join("\n"),
        },
      ],
      interviewQuestionsSchema,
      { maxTokens: 500, temperature: 0.6 }
    );
    return { questions: result.questions };
  },

  /**
   * Plain-English search. The model only *translates* the sentence into
   * filters; the search itself is an ordinary tenant-scoped database query with
   * exact skill names, exactly like the core matching. Skills it names that the
   * database doesn't have are reported back rather than silently dropped.
   */
  async searchCandidates(tenantId: string, query: string) {
    const known = await skillRepository.findAllNames();
    const raw = await generateJson(
      [
        {
          role: "system",
          content:
            `Today's date is ${today()}. You turn a recruiter's request into search filters. Reply with ONLY one JSON ` +
            'object with the keys "skills" (skills every candidate must have), "location" (a city or region), ' +
            '"minExperience" and "maxExperience" (years, numbers), "nameContains". Use null for anything not asked for. ' +
            "Do not invent constraints. " +
            untrustedNote("request"),
        },
        {
          role: "user",
          content: `Known skills (use exactly these names): ${known.slice(0, 200).join(", ")}\n\n${untrusted("request", query, 300)}`,
        },
      ],
      searchFiltersSchema,
      { maxTokens: 300 }
    );

    const skills = new Set<string>();
    const unknownSkills: string[] = [];
    for (const skill of raw.skills) {
      const canonical = canonicalSkill(skill, known);
      if (canonical) skills.add(canonical);
      else unknownSkills.push(skill.toLowerCase());
    }
    const filters = {
      skills: [...skills],
      location: raw.location ?? undefined,
      minExperience: raw.minExperience ?? undefined,
      maxExperience: raw.maxExperience ?? undefined,
      nameContains: raw.nameContains ?? undefined,
    };
    const { items, total } = await candidateRepository.findByFilters(tenantId, filters);
    return { interpretation: filters, unknownSkills, items, total };
  },

  /** A short narrative over the dashboard's numbers. Counts and skill names only: no personal data. */
  async dashboardBrief(tenantId: string) {
    const overview = await dashboardService.overview(tenantId);
    const lines = [
      `Candidates: ${overview.totals.candidates} (${overview.totals.addedThisWeek} added this week)`,
      `Open job orders: ${overview.totals.openJobOrders}, with ${overview.totals.openings} openings in total`,
      `Submissions: ${overview.pipeline.map((p) => `${p.count} ${p.status.toLowerCase().replace(/_/g, " ")}`).join(", ") || "none yet"}`,
      `Skills in demand (open roles needing it vs candidates who have it): ${
        overview.skillGaps.map((g) => `${g.skill} ${g.demand}/${g.supply}`).join("; ") || "none"
      }`,
      `Roles with the fewest matching candidates: ${
        overview.rolesNeedingAttention.map((r) => `${r.title} (${r.candidates} matching, ${r.shortlisted} shortlisted)`).join("; ") || "none"
      }`,
    ];
    const brief = await generateChatCompletion(
      [
        {
          role: "system",
          content:
            "You are a recruiting analyst. From the figures given, write a brief for the recruiter: 3-4 sentences on " +
            "where things stand, then 2-3 short suggested next actions, each on its own line starting with '- '. " +
            "Use only the figures provided; do not invent numbers. No markdown headings.",
        },
        { role: "user", content: lines.join("\n") },
      ],
      { maxTokens: 350, temperature: 0.4 }
    );
    return { brief };
  },

  /**
   * The matching itself stays deterministic: dashboardRepository.topUnshortlistedPairing picks the
   * single best-matching candidate/job-order pair (exact skill match, highest count) that hasn't
   * been shortlisted yet. The AI's only job is to write one sentence explaining the pick.
   */
  async recommendShortlist(tenantId: string) {
    const pairing = await dashboardRepository.topUnshortlistedPairing(tenantId);
    if (!pairing) return { pick: null };

    const { jobOrder, candidate, matchedSkillNames } = await loadMatchContext(
      tenantId,
      pairing.jobOrderId,
      pairing.candidateId
    );

    const reason = await generateChatCompletion(
      [
        {
          role: "system",
          content:
            "You are a recruiting analyst. In one sentence (30 words or fewer), explain why this candidate is a " +
            "strong pick to shortlist next for this role. Use only the facts given; do not invent anything. " +
            "Plain text, no markdown.",
        },
        {
          role: "user",
          content: [
            `Role: ${jobOrder.title}, ${jobOrder.numberOfOpenings.toString()} opening(s).`,
            `Candidate: ${candidate.experienceYears.toString()} years of experience.`,
            `Matched required skills: ${matchedSkillNames.join(", ") || "none"} (${pairing.matchCount.toString()} of the role's required skills).`,
          ].join("\n"),
        },
      ],
      { maxTokens: 100, temperature: 0.4 }
    );

    return {
      pick: {
        jobOrderId: jobOrder.id,
        jobOrderTitle: jobOrder.title,
        candidateId: candidate.id,
        candidateName: candidate.fullName,
        matchCount: pairing.matchCount,
        reason,
      },
    };
  },

  /** A short check-in for a submission that's been sitting in the same stage a while. Never sent by the app. */
  async draftFollowUp(tenantId: string, userId: string, jobOrderId: string, candidateId: string) {
    const { jobOrder, candidate } = await loadMatchContext(tenantId, jobOrderId, candidateId);
    const recruiter = await userRepository.findById(userId);

    const draft = await generateJson(
      [
        {
          role: "system",
          content:
            "You write a short (60-100 words) check-in email from a recruiter to a candidate already in process " +
            `for a role, asking for a status update on next steps. Address the candidate as ${CANDIDATE_NAME} and ` +
            `sign off as ${RECRUITER_NAME}; use those two placeholders exactly. Only mention the facts provided. ` +
            'Reply with ONLY one JSON object: {"subject": "...", "body": "..."}. Plain text, no markdown.',
        },
        {
          role: "user",
          content: [
            `Role: ${jobOrder.title}${jobOrder.clientName ? ` at ${jobOrder.clientName}` : ""}, ${jobOrder.location}.`,
            "This candidate has been in the current stage for a while with no update.",
          ].join("\n"),
        },
      ],
      outreachDraftSchema,
      { maxTokens: 400, temperature: 0.5 }
    );

    const values = { [CANDIDATE_NAME]: candidate.fullName, [RECRUITER_NAME]: recruiter?.name ?? "The recruiting team" };
    return { subject: fill(draft.subject, values), body: fill(draft.body, values) };
  },

  /** A short confirmation or reminder for one interview round. Never sent by the app — no calendar integration. */
  async draftInterviewMessage(tenantId: string, userId: string, interviewId: string, kind: "confirmation" | "reminder") {
    const interview = await interviewRepository.findById(tenantId, interviewId);
    if (!interview) throw new NotFoundError("Interview");
    const submission = await submissionRepository.findById(tenantId, interview.submissionId);
    if (!submission) throw new NotFoundError("Submission");
    const recruiter = await userRepository.findById(userId);

    const when = interview.scheduledAt.toLocaleString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    const modeLabel = interview.mode.charAt(0) + interview.mode.slice(1).toLowerCase();

    const intent =
      kind === "confirmation"
        ? "confirm that an interview has been scheduled and ask the candidate to confirm they can attend"
        : "remind the candidate of their upcoming interview, restating the details";

    const draft = await generateJson(
      [
        {
          role: "system",
          content:
            `You write a short (60-100 words) email from a recruiter to a candidate to ${intent}. Address the ` +
            `candidate as ${CANDIDATE_NAME} and sign off as ${RECRUITER_NAME}; use those two placeholders exactly. ` +
            "Only mention the facts provided. Do not mention a video/call link or any tool, since none is provided. " +
            'Reply with ONLY one JSON object: {"subject": "...", "body": "..."}. Plain text, no markdown.',
        },
        {
          role: "user",
          content: [
            `Role: ${submission.jobOrder.title}${submission.jobOrder.clientName ? ` at ${submission.jobOrder.clientName}` : ""}.`,
            `Interview round: ${interview.round.toString()}.`,
            `Date and time: ${when}.`,
            `Mode: ${modeLabel}.`,
          ].join("\n"),
        },
      ],
      outreachDraftSchema,
      { maxTokens: 400, temperature: 0.5 }
    );

    const values = { [CANDIDATE_NAME]: submission.candidate.fullName, [RECRUITER_NAME]: recruiter?.name ?? "The recruiting team" };
    return { subject: fill(draft.subject, values), body: fill(draft.body, values) };
  },
};
