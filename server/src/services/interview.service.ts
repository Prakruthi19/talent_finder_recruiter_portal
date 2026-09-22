import { InterviewMode, InterviewStatus } from "@prisma/client";
import { interviewRepository } from "../repositories/interview.repository";
import { submissionRepository } from "../repositories/submission.repository";
import { NotFoundError } from "../lib/errors";

export const interviewService = {
  /** Round number is assigned server-side (existing count + 1) — never trusted from the client. */
  async schedule(
    tenantId: string,
    submissionId: string,
    input: { scheduledAt: Date; mode: InterviewMode; notes?: string }
  ) {
    const submission = await submissionRepository.findById(tenantId, submissionId);
    if (!submission) throw new NotFoundError("Submission");

    const round = (await interviewRepository.countBySubmission(tenantId, submissionId)) + 1;
    return interviewRepository.create({
      tenantId,
      submissionId,
      round,
      scheduledAt: input.scheduledAt,
      mode: input.mode,
      notes: input.notes,
    });
  },

  async updateStatus(
    tenantId: string,
    id: string,
    input: { status?: InterviewStatus; scheduledAt?: Date; notes?: string }
  ) {
    const interview = await interviewRepository.findById(tenantId, id);
    if (!interview) throw new NotFoundError("Interview");
    return interviewRepository.update(id, input);
  },
};
