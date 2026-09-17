import { ChangeEvent, FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiUploadCloud } from "react-icons/fi";
import { useCreateCandidateMutation, useParseCvMutation } from "../../api/candidatesApi";
import { useAppSelector } from "../../store/hooks";
import { FormPageLayout } from "../../components/ui/FormPageLayout";
import { FormField } from "../../components/forms/FormField";
import { SkillsInput } from "../../components/forms/SkillsInput";
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
  const [location, setLocation] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvNotice, setCvNotice] = useState<string>();
  const [errors, setErrors] = useState<FormErrors>({});
  const [createCandidate, { isLoading }] = useCreateCandidateMutation();
  const [parseCv, { isLoading: isParsing }] = useParseCvMutation();

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setCvFile(file);
    setCvNotice(undefined);
    if (!file) return;

    try {
      const result = await parseCv(file).unwrap();
      if (!result.readable) {
        setCvNotice(
          "Couldn't read this file (scanned image, corrupt, or no text layer) — please fill in the fields manually."
        );
        return;
      }

      // A new file replaces the previous file's auto-fill outright — if we
      // only filled empty fields, a second (correct) CV could never
      // overwrite values a first (wrong) CV already populated.
      const fields = result.fields ?? { skills: [] };
      if (fields.fullName) setFullName(fields.fullName);
      if (fields.location) setLocation(fields.location);
      if (fields.experienceYears !== undefined) setExperienceYears(String(fields.experienceYears));
      if (fields.skills.length > 0) setSkills(fields.skills);
      setCvNotice("Fields auto-filled from the CV where detected — review and edit before saving.");
    } catch {
      setCvNotice("Couldn't parse this file — please fill in the fields manually.");
    }
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
        <div className="flex flex-col gap-1 rounded-md border border-dashed border-slate-300 p-4">
          <label htmlFor="cv-upload" className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
            <FiUploadCloud className="h-4 w-4 text-slate-400" aria-hidden="true" />
            Upload CV (optional)
          </label>
          <input
            id="cv-upload"
            type="file"
            accept=".pdf,.docx"
            onChange={handleFileChange}
            disabled={isParsing}
            className="w-full min-w-0 text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-brand-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-brand-700 hover:file:bg-brand-100 disabled:opacity-60"
          />
          {isParsing && <p className="text-xs text-slate-500">Reading CV and detecting fields...</p>}
          {cvNotice && <p className="text-xs text-amber-600">{cvNotice}</p>}
          <p className="text-xs text-slate-400">Accepts .pdf or .docx, up to 5MB.</p>
        </div>

        <FormField
          label="Full Name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={errors.fullName}
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
