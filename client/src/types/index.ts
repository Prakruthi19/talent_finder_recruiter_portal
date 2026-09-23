export type Role = "ADMIN" | "RECRUITER";

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

/** A tenant the signed-in user belongs to, with their role in it. */
export interface AuthTenant {
  id: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  role: Role;
}

export interface AuthProfile {
  user: AuthUser;
  tenants: AuthTenant[];
}

export interface LoginResponse extends AuthProfile {
  token: string;
}

export interface Tenant {
  id: string;
  name: string;
  status: "ACTIVE" | "INACTIVE";
  createdAt: string;
  updatedAt: string;
}

export interface Skill {
  id: string;
  name: string;
}

export interface CandidateSkillLink {
  skill: Skill;
}

export interface Candidate {
  id: string;
  tenantId: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  location: string | null;
  experienceYears: string;
  // No cvPath: that's the file's real path on the server's disk, and the API
  // never sends it (candidate.controller.ts strips it). cvOriginalName alone
  // tells you whether a CV was uploaded.
  cvOriginalName: string | null;
  createdAt: string;
  updatedAt: string;
  skills: CandidateSkillLink[];
}

export interface CandidateWithSubmissions extends Candidate {
  submissions: Submission[];
}

export interface Note {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; name: string };
}

export type JobOrderStatus = "OPEN" | "CLOSED";

export interface JobOrderRequiredSkillLink {
  skill: Skill;
}

export interface JobOrder {
  id: string;
  tenantId: string;
  title: string;
  clientName: string | null;
  location: string;
  minExperience: string;
  numberOfOpenings: number;
  status: JobOrderStatus;
  createdAt: string;
  updatedAt: string;
  requiredSkills: JobOrderRequiredSkillLink[];
}

export type SubmissionStatus =
  | "SHORTLISTED"
  | "SUBMITTED_TO_CLIENT"
  | "INTERVIEWING"
  | "OFFERED"
  | "REJECTED"
  | "HIRED";

export interface Submission {
  id: string;
  tenantId: string;
  candidateId: string;
  jobOrderId: string;
  status: SubmissionStatus;
  matchCount: number;
  createdAt: string;
  updatedAt: string;
  candidate?: Candidate;
  jobOrder?: JobOrder;
  interviews?: Interview[];
}

export type InterviewMode = "PHONE" | "VIDEO" | "ONSITE";
export type InterviewStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

export interface Interview {
  id: string;
  tenantId: string;
  submissionId: string;
  round: number;
  scheduledAt: string;
  mode: InterviewMode;
  status: InterviewStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MatchingCandidateRow {
  candidate: Candidate;
  matchCount: number;
  matchedSkillNames: string[];
  shortlisted: boolean;
  submissionStatus: SubmissionStatus | null;
}

export interface JobOrderMatchesResult {
  jobOrder: JobOrder;
  matchingCandidates: MatchingCandidateRow[];
  shortlistedCandidates: MatchingCandidateRow[];
}

export interface ParsedCandidateFields {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  experienceYears?: number;
  /** Skills from the database that the CV mentions. */
  skills: string[];
  /** Skills the CV lists that aren't in the database yet: offered as click-to-add suggestions. */
  suggestedSkills: string[];
}

export type UnreadableReason = "empty" | "password_protected" | "corrupt";

export interface CvParseResult {
  readable: boolean;
  reason?: UnreadableReason;
  fields?: ParsedCandidateFields;
  diagnostics?: { characters: number; letters: number; words: number; aiUsed: boolean };
}

/** Optional server features, so the UI only offers what can work. */
export interface Features {
  ai: boolean;
  google: boolean;
}

export interface DashboardOverview {
  totals: { candidates: number; addedThisWeek: number; openJobOrders: number; openings: number; submissions: number };
  pipeline: { status: string; count: number }[];
  /** Skills open roles need, scarcest first. demand = open roles needing it, supply = candidates who have it. */
  skillGaps: { skill: string; demand: number; supply: number }[];
  rolesNeedingAttention: { id: string; title: string; openings: number; candidates: number; shortlisted: number }[];
  /** The longest-untouched submission still in an active stage (7+ days), or null. */
  staleSubmission: Submission | null;
  /** New submissions per week, oldest first, for the last 8 weeks (including weeks with zero). */
  submissionsTrend: { weekStart: string; count: number }[];
}

export interface RecommendedPick {
  jobOrderId: string;
  jobOrderTitle: string;
  candidateId: string;
  candidateName: string;
  matchCount: number;
  reason: string;
}

export interface AuditLogRow {
  id: string;
  createdAt: string;
  user: { name: string; email: string } | null;
  description: string;
  action: string;
  entityId: string | null;
}

export interface JobDescriptionDraft {
  title?: string;
  clientName?: string;
  location?: string;
  minExperience?: number;
  numberOfOpenings?: number;
  skills: string[];
  suggestedSkills: string[];
}

export interface OutreachDraft {
  subject: string;
  body: string;
}

export interface CandidateSearchResult {
  interpretation: { skills: string[]; location?: string; minExperience?: number; maxExperience?: number; nameContains?: string };
  unknownSkills: string[];
  items: Candidate[];
  total: number;
}
