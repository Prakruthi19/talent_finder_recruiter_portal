import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";

const noteWithAuthor = {
  include: { author: { select: { id: true, name: true } } },
} satisfies Prisma.NoteDefaultArgs;

export type NoteWithAuthor = Prisma.NoteGetPayload<typeof noteWithAuthor>;

export const noteRepository = {
  findByCandidate(tenantId: string, candidateId: string): Promise<NoteWithAuthor[]> {
    return prisma.note.findMany({
      where: { tenantId, candidateId },
      orderBy: { createdAt: "desc" },
      ...noteWithAuthor,
    });
  },

  findBySubmission(tenantId: string, submissionId: string): Promise<NoteWithAuthor[]> {
    return prisma.note.findMany({
      where: { tenantId, submissionId },
      orderBy: { createdAt: "desc" },
      ...noteWithAuthor,
    });
  },

  createForCandidate(data: { tenantId: string; candidateId: string; authorId: string; body: string }) {
    return prisma.note.create({ data, ...noteWithAuthor });
  },

  createForSubmission(data: { tenantId: string; submissionId: string; authorId: string; body: string }) {
    return prisma.note.create({ data, ...noteWithAuthor });
  },
};
