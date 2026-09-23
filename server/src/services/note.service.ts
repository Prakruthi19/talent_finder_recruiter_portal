import { noteRepository } from "../repositories/note.repository";
import { candidateRepository } from "../repositories/candidate.repository";
import { submissionRepository } from "../repositories/submission.repository";
import { NotFoundError } from "../lib/errors";

export const noteService = {
  async listForCandidate(tenantId: string, candidateId: string) {
    const candidate = await candidateRepository.findById(tenantId, candidateId);
    if (!candidate) throw new NotFoundError("Candidate");
    return noteRepository.findByCandidate(tenantId, candidateId);
  },

  async addToCandidate(tenantId: string, authorId: string, candidateId: string, body: string) {
    const candidate = await candidateRepository.findById(tenantId, candidateId);
    if (!candidate) throw new NotFoundError("Candidate");
    return noteRepository.createForCandidate({ tenantId, candidateId, authorId, body });
  },

  async listForSubmission(tenantId: string, submissionId: string) {
    const submission = await submissionRepository.findById(tenantId, submissionId);
    if (!submission) throw new NotFoundError("Submission");
    return noteRepository.findBySubmission(tenantId, submissionId);
  },

  async addToSubmission(tenantId: string, authorId: string, submissionId: string, body: string) {
    const submission = await submissionRepository.findById(tenantId, submissionId);
    if (!submission) throw new NotFoundError("Submission");
    return noteRepository.createForSubmission({ tenantId, submissionId, authorId, body });
  },
};
