-- CreateIndex
CREATE INDEX "candidate_skills_skillId_idx" ON "candidate_skills"("skillId");

-- CreateIndex
CREATE INDEX "job_order_required_skills_skillId_idx" ON "job_order_required_skills"("skillId");

-- CreateIndex
CREATE INDEX "submissions_jobOrderId_idx" ON "submissions"("jobOrderId");
