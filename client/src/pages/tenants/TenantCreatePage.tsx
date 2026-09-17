import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCreateTenantMutation } from "../../api/tenantsApi";
import { FormPageLayout } from "../../components/ui/FormPageLayout";
import { FormField } from "../../components/forms/FormField";
import { Button } from "../../components/ui/Button";

export function TenantCreatePage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [error, setError] = useState<string>();
  const [createTenant, { isLoading }] = useCreateTenantMutation();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(undefined);
    if (!name.trim()) {
      setError("Tenant name is required");
      return;
    }
    try {
      await createTenant({ name: name.trim() }).unwrap();
      navigate("/tenants");
    } catch (err) {
      const message =
        (err as { data?: { error?: string } })?.data?.error ?? "Failed to create tenant";
      setError(message);
    }
  }

  return (
    <FormPageLayout title="Create Tenant">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <FormField
          label="Tenant Name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. LinkedIn"
          error={error}
        />
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={() => navigate("/tenants")}>
            Cancel
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Tenant"}
          </Button>
        </div>
      </form>
    </FormPageLayout>
  );
}
