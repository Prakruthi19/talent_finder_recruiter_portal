import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateCandidateMutation } from "../../api/candidatesApi";
import { useAppSelector } from "../../store/hooks";
import { FormPageLayout } from "../../components/ui/FormPageLayout";
import { FormField } from "../../components/forms/FormField";
import { SkillsInput } from "../../components/forms/SkillsInput";
import { CvUploadPanel } from "../../components/forms/CvUploadPanel";
import type { ParsedCandidateFields } from "../../types";
import { Button } from "../../components/ui/Button";

interface FormErrors {
  fullName?: string;
  experienceYears?: string;
  skills?: string;
  form?: string;
}

export function CandidateCreatePage() {
  const navigate = useNavigate();
  const tenantId = useAppSelector((s) => s.tenant.selectedTenantId);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [location, setLocation] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [errors, setErrors] = useState<FormErrors>({});
  const [createCandidate, { isLoading }] = useCreateCandidateMutation();

  function applyParsedFields(fields: ParsedCandidateFields) {
    if (fields.fullName) setFullName(fields.fullName);
    if (fields.email) setEmail(fields.email);
    if (fields.location) setLocation(fields.location);
    if (fields.experienceYears !== undefined) setExperienceYears(String(fields.experienceYears));
    if (fields.skills.length > 0) setSkills(fields.skills);
  }

  function validate(): boolean {
    const next: FormErrors = {};
    if (!fullName.trim()) next.fullName = "Full name is required";
    if (!experienceYears || Number(experienceYears) < 0) next.experienceYears = "Total experience is required";
    if (skills.length === 0) next.skills = "At least one skill is required";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    if (!tenantId) {
      setErrors({ form: "Select a tenant first" });
      return;
    }
    try {
      const candidate = await createCandidate({
        fullName: fullName.trim(),
        email: email.trim() || undefined,
        location: location.trim() || undefined,
        experienceYears: Number(experienceYears),
        skills,
        cvFile,
      }).unwrap();
      navigate(`/candidates/${candidate.id}`);
    } catch (err) {
      const message =
        (err as { data?: { error?: string } })?.data?.error ?? "Failed to create candidate";
      setErrors({ form: message });
    }
  }

  return (
    <FormPageLayout title="Add Candidate">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <CvUploadPanel
          onFile={setCvFile}
          onFields={applyParsedFields}
          onAddSkill={(skill) => setSkills((current) => (current.includes(skill) ? current : [...current, skill]))}
          skills={skills}
        />

        <FormField
          label="Full Name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={errors.fullName}
        />
        <FormField
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@example.com"
          hint="Optional. Used to detect duplicate candidates within a tenant."
        />
        <FormField label="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
        <FormField
          label="Total Experience (Years)"
          required
          type="number"
          min={0}
          step={0.5}
          value={experienceYears}
          onChange={(e) => setExperienceYears(e.target.value)}
          error={errors.experienceYears}
        />
        <SkillsInput label="Skills" required value={skills} onChange={setSkills} error={errors.skills} />

        {errors.form && <p className="text-sm text-red-600">{errors.form}</p>}

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate("/candidates")}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Add Candidate"}
          </Button>
        </div>
      </form>
    </FormPageLayout>
  );
}
