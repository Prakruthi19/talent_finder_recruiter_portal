import { FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useGetJobOrderQuery, useUpdateJobOrderMutation } from "../../api/jobOrdersApi";
import { FormPageLayout } from "../../components/ui/FormPageLayout";
import { FormField } from "../../components/forms/FormField";
import { SkillsInput } from "../../components/forms/SkillsInput";
import { Button } from "../../components/ui/Button";
import { LoadingState, ErrorState } from "../../components/ui/PageStates";

interface FormErrors {
  title?: string;
  location?: string;
  minExperience?: string;
  numberOfOpenings?: string;
  skills?: string;
  form?: string;
}

export function JobOrderEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: jobOrder, isLoading, isError } = useGetJobOrderQuery(id!);
  const [updateJobOrder, { isLoading: isSaving }] = useUpdateJobOrderMutation();

  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [location, setLocation] = useState("");
  const [minExperience, setMinExperience] = useState("");
  const [numberOfOpenings, setNumberOfOpenings] = useState("1");
  const [status, setStatus] = useState<"OPEN" | "CLOSED">("OPEN");
  const [skills, setSkills] = useState<string[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (jobOrder) {
      setTitle(jobOrder.title);
      setClientName(jobOrder.clientName ?? "");
      setLocation(jobOrder.location);
      setMinExperience(String(jobOrder.minExperience));
      setNumberOfOpenings(String(jobOrder.numberOfOpenings));
      setStatus(jobOrder.status);
      setSkills(jobOrder.requiredSkills.map((s) => s.skill.name));
    }
  }, [jobOrder]);

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
    if (!validate() || !id) return;
    try {
      await updateJobOrder({
        id,
        body: {
          title: title.trim(),
          clientName: clientName.trim() || undefined,
          location: location.trim(),
          minExperience: Number(minExperience),
          numberOfOpenings: Number(numberOfOpenings),
          status,
          skills,
        },
      }).unwrap();
      navigate(`/job-orders/${id}`);
    } catch (err) {
      const message =
        (err as { data?: { error?: string } })?.data?.error ?? "Failed to update job order";
      setErrors({ form: message });
    }
  }

  if (isLoading) return <LoadingState />;
  if (isError || !jobOrder) return <ErrorState label="Job order not found." />;

  return (
    <FormPageLayout title="Edit Job Order">
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
        <div className="flex flex-col gap-1">
          <label htmlFor="status" className="text-sm font-medium text-slate-700">
            Status
          </label>
          <select
            id="status"
            value={status}
            onChange={(e) => setStatus(e.target.value as "OPEN" | "CLOSED")}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-brand-600 focus:outline-none focus:ring-1 focus:ring-brand-600"
          >
            <option value="OPEN">Open</option>
            <option value="CLOSED">Closed</option>
          </select>
        </div>
        <SkillsInput label="Required Skills" required value={skills} onChange={setSkills} error={errors.skills} />

        {errors.form && <p className="text-sm text-red-600">{errors.form}</p>}

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate(`/job-orders/${id}`)}>
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
