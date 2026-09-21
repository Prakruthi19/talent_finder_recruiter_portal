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
  cvPath: string | null;
  cvOriginalName: string | null;
  createdAt: string;
  updatedAt: string;
  skills: CandidateSkillLink[];
}

export interface CandidateWithSubmissions extends Candidate {
  submissions: Submission[];
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
  skills: string[];
}

export interface CvParseResult {
  readable: boolean;
  fields?: ParsedCandidateFields;
}
