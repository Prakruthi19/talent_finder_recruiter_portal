import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiPlus, FiEye, FiEdit2, FiTrash2 } from "react-icons/fi";
import {
  useGetJobOrdersQuery,
  useGetJobOrderSummaryQuery,
  useDeleteJobOrderMutation,
  JobOrderListParams,
} from "../../api/jobOrdersApi";
import { useAppSelector } from "../../store/hooks";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { ListPageLayout } from "../../components/ui/ListPageLayout";
import { SearchInput } from "../../components/ui/SearchInput";
import { SortSelect } from "../../components/ui/SortSelect";
import { Pagination } from "../../components/ui/Pagination";
import { Button } from "../../components/ui/Button";
import { SummaryCard } from "../../components/ui/SummaryCard";
import { SkillChips } from "../../components/ui/SkillChips";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { ActionMenu } from "../../components/ui/ActionMenu";
import { Table, THead, Th, TBody, Tr, Td } from "../../components/ui/Table";
import { EmptyState, ErrorState, LoadingState } from "../../components/ui/PageStates";
import { formatExperience } from "../../lib/format";

const PAGE_SIZE = 10;

const SORT_OPTIONS = [
  { value: "title:asc", label: "Title (A-Z)" },
  { value: "title:desc", label: "Title (Z-A)" },
  { value: "minExperience:desc", label: "Min Experience (High-Low)" },
  { value: "createdAt:desc", label: "Newest First" },
];

export function JobOrderListPage() {
  const navigate = useNavigate();
  const tenantId = useAppSelector((s) => s.tenant.selectedTenantId);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("createdAt:desc");
  const debouncedSearch = useDebouncedValue(search);
  const [sortBy, sortDir] = sort.split(":") as [JobOrderListParams["sortBy"], JobOrderListParams["sortDir"]];

  const { data, isLoading, isError } = useGetJobOrdersQuery(
    tenantId ? { page, pageSize: PAGE_SIZE, search: debouncedSearch || undefined, sortBy, sortDir } : undefined,
    { skip: !tenantId }
  );
  const { data: summary } = useGetJobOrderSummaryQuery(undefined, { skip: !tenantId });
  const [deleteJobOrder] = useDeleteJobOrderMutation();

  async function handleDelete(id: string, title: string) {
    if (!window.confirm(`Delete job order "${title}"? This cannot be undone.`)) return;
    await deleteJobOrder(id);
  }

  return (
    <ListPageLayout
      title="Job Orders"
      showTenantSelect
      primaryAction={
        <Button onClick={() => navigate("/job-orders/new")}>
          <FiPlus className="h-4 w-4" aria-hidden="true" />
          Create Job Order
        </Button>
      }
      summaryCards={
        <>
          <SummaryCard label="Total Job Orders" value={summary?.total ?? "–"} />
          <SummaryCard label="Open Positions" value={summary?.openCount ?? "–"} />
        </>
      }
      toolbar={
        <>
          <SearchInput
            value={search}
            onChange={(v) => {
              setSearch(v);
              setPage(1);
            }}
            placeholder="Search by title, client, location..."
          />
          <SortSelect value={sort} onChange={setSort} options={SORT_OPTIONS} />
        </>
      }
      footer={
        data && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
        )
      }
    >
      {!tenantId ? (
        <EmptyState label="Select a tenant to view job orders." />
      ) : isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState />
      ) : !data?.items.length ? (
        <EmptyState label="No job orders found. Create one to get started." />
      ) : (
        <Table>
          <THead>
            <Th>Job Title</Th>
            <Th>Client</Th>
            <Th>Location</Th>
            <Th>Min Exp</Th>
            <Th>Openings</Th>
            <Th>Required Skills</Th>
            <Th>Status</Th>
            <Th>Actions</Th>
          </THead>
          <TBody>
            {data.items.map((j) => (
              <Tr key={j.id}>
                <Td className="font-medium text-slate-900">
                  <button
                    className="hover:text-brand-700 hover:underline"
                    onClick={() => navigate(`/job-orders/${j.id}`)}
                  >
                    {j.title}
                  </button>
                </Td>
                <Td>{j.clientName || "—"}</Td>
                <Td>{j.location}</Td>
                <Td>{formatExperience(j.minExperience)}</Td>
                <Td>{j.numberOfOpenings}</Td>
                <Td className="max-w-xs">
                  <SkillChips skills={j.requiredSkills.map((s) => s.skill.name)} max={3} />
                </Td>
                <Td>
                  <StatusBadge status={j.status} />
                </Td>
                <Td>
                  <ActionMenu
                    items={[
                      { label: "View", icon: FiEye, onClick: () => navigate(`/job-orders/${j.id}`) },
                      { label: "Edit", icon: FiEdit2, onClick: () => navigate(`/job-orders/${j.id}/edit`) },
                      {
                        label: "Delete",
                        icon: FiTrash2,
                        destructive: true,
                        onClick: () => handleDelete(j.id, j.title),
                      },
                    ]}
                  />
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </ListPageLayout>
  );
}
