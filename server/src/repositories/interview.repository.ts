import { InterviewMode, InterviewStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";

export interface CreateInterviewInput {
  tenantId: string;
  submissionId: string;
  round: number;
  scheduledAt: Date;
  mode: InterviewMode;
  notes?: string | null;
}

export interface UpdateInterviewInput {
  status?: InterviewStatus;
  scheduledAt?: Date;
  notes?: string | null;
}

export const interviewRepository = {
  findBySubmission(tenantId: string, submissionId: string) {
    return prisma.interview.findMany({
      where: { tenantId, submissionId },
      orderBy: { round: "asc" },
    });
  },

  countBySubmission(tenantId: string, submissionId: string) {
    return prisma.interview.count({ where: { tenantId, submissionId } });
  },

  findById(tenantId: string, id: string) {
    return prisma.interview.findFirst({ where: { tenantId, id } });
  },

  create(data: CreateInterviewInput) {
    return prisma.interview.create({ data });
  },

  // Ownership is checked by the service layer (findById(tenantId, id)) before this is called;
  // row-level security is the backstop, same as candidate.repository.update.
  update(id: string, data: UpdateInterviewInput) {
    return prisma.interview.update({ where: { id }, data });
  },
};
