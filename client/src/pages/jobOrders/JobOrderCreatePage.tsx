import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateJobOrderMutation } from "../../api/jobOrdersApi";
import { useAppSelector } from "../../store/hooks";
import { FormPageLayout } from "../../components/ui/FormPageLayout";
import { FormField } from "../../components/forms/FormField";
import { SkillsInput } from "../../components/forms/SkillsInput";
import { Button } from "../../components/ui/Button";

interface FormErrors {
  title?: string;
  location?: string;
  minExperience?: string;
  numberOfOpenings?: string;
  skills?: string;
  form?: string;
}

export function JobOrderCreatePage() {
  const navigate = useNavigate();
  const tenantId = useAppSelector((s) => s.tenant.selectedTenantId);
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [location, setLocation] = useState("");
  const [minExperience, setMinExperience] = useState("");
  const [numberOfOpenings, setNumberOfOpenings] = useState("1");
  const [skills, setSkills] = useState<string[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [createJobOrder, { isLoading }] = useCreateJobOrderMutation();

  function validate(): boolean {
    const next: FormErrors = {};
    if (!title.trim()) next.title = "Job title is required";
    if (!location.trim()) next.location = "Location is required";
    if (!minExperience || Number(minExperience) < 0) next.minExperience = "Min experience is required";
    if (!numberOfOpenings || Number(numberOfOpenings) < 1) next.numberOfOpenings = "At least 1 opening is required";
    if (skills.length === 0) next.skills = "At least one required skill is needed";
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
      const jobOrder = await createJobOrder({
        title: title.trim(),
        clientName: clientName.trim() || undefined,
        location: location.trim(),
        minExperience: Number(minExperience),
        numberOfOpenings: Number(numberOfOpenings),
        skills,
      }).unwrap();
      navigate(`/job-orders/${jobOrder.id}`);
    } catch (err) {
      const message =
        (err as { data?: { error?: string } })?.data?.error ?? "Failed to create job order";
      setErrors({ form: message });
    }
  }

  return (
    <FormPageLayout title="Create Job Order">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField label="Job Title" required value={title} onChange={(e) => setTitle(e.target.value)} error={errors.title} />
        <FormField label="Client Name" value={clientName} onChange={(e) => setClientName(e.target.value)} />
        <FormField label="Location" required value={location} onChange={(e) => setLocation(e.target.value)} error={errors.location} />
        <FormField
          label="Min Experience (Years)"
          required
          type="number"
          min={0}
          step={0.5}
          value={minExperience}
          onChange={(e) => setMinExperience(e.target.value)}
          error={errors.minExperience}
        />
        <FormField
          label="Number of Openings"
          required
          type="number"
          min={1}
          step={1}
          value={numberOfOpenings}
          onChange={(e) => setNumberOfOpenings(e.target.value)}
          error={errors.numberOfOpenings}
        />
        <SkillsInput label="Required Skills" required value={skills} onChange={setSkills} error={errors.skills} />

        {errors.form && <p className="text-sm text-red-600">{errors.form}</p>}

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate("/job-orders")}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Saving..." : "Create Job Order"}
          </Button>
        </div>
      </form>
    </FormPageLayout>
  );
}
