import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGetCandidateQuery, useUpdateCandidateMutation } from "../../api/candidatesApi";
import { FormPageLayout } from "../../components/ui/FormPageLayout";
import { FormField } from "../../components/forms/FormField";
import { SkillsInput } from "../../components/forms/SkillsInput";
import { Button } from "../../components/ui/Button";
import { LoadingState, ErrorState } from "../../components/ui/PageStates";

interface FormErrors {
  fullName?: string;
  experienceYears?: string;
  skills?: string;
  form?: string;
}

export function CandidateEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: candidate, isLoading, isError } = useGetCandidateQuery(id!);
  const [updateCandidate, { isLoading: isSaving }] = useUpdateCandidateMutation();

  const [fullName, setFullName] = useState("");
  const [location, setLocation] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [skills, setSkills] = useState<string[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (candidate) {
      setFullName(candidate.fullName);
      setLocation(candidate.location ?? "");
      setExperienceYears(String(candidate.experienceYears));
      setSkills(candidate.skills.map((s) => s.skill.name));
    }
  }, [candidate]);

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
    if (!validate() || !id) return;
    try {
      await updateCandidate({
        id,
        body: {
          fullName: fullName.trim(),
          location: location.trim() || undefined,
          experienceYears: Number(experienceYears),
          skills,
        },
      }).unwrap();
      navigate(`/candidates/${id}`);
    } catch (err) {
      const message =
        (err as { data?: { error?: string } })?.data?.error ?? "Failed to update candidate";
      setErrors({ form: message });
    }
  }

  if (isLoading) return <LoadingState />;
  if (isError || !candidate) return <ErrorState label="Candidate not found." />;

  return (
    <FormPageLayout title="Edit Candidate">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          <Button type="button" variant="secondary" onClick={() => navigate(`/candidates/${id}`)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </FormPageLayout>
  );
}
