import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FiPlus, FiEye, FiEdit2, FiTrash2 } from "react-icons/fi";
import {
  useGetJobOrdersQuery,
  useGetJobOrderSummaryQuery,
  useDeleteJobOrderMutation,
  JobOrderListParams,
} from "../../api/jobOrdersApi";
import { useAppSelector } from "../../store/hooks";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { useCurrentRole } from "../../hooks/useAuth";
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
  const location = useLocation();
  const tenantId = useAppSelector((s) => s.tenant.selectedTenantId);
  const isAdmin = useCurrentRole() === "ADMIN";
  const [page, setPage] = useState(1);
  // Dashboard's "Skills in demand" card links here with a skill preset via router state.
  const [search, setSearch] = useState(() => (location.state as { search?: string } | null)?.search ?? "");
  const [sort, setSort] = useState("createdAt:desc");
  const debouncedSearch = useDebouncedValue(search);
  const [sortBy, sortDir] = sort.split(":") as [JobOrderListParams["sortBy"], JobOrderListParams["sortDir"]];

  const { data, isLoading, isError } = useGetJobOrdersQuery(
    { tenantId: tenantId ?? "", page, pageSize: PAGE_SIZE, search: debouncedSearch || undefined, sortBy, sortDir },
    { skip: !tenantId }
  );
  const { data: summary } = useGetJobOrderSummaryQuery({ tenantId: tenantId ?? "" }, { skip: !tenantId });
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
            <Th className="hidden sm:table-cell">Client</Th>
            <Th className="hidden sm:table-cell">Location</Th>
            <Th className="hidden sm:table-cell">Min Exp</Th>
            <Th className="hidden sm:table-cell">Openings</Th>
            <Th className="hidden sm:table-cell">Required Skills</Th>
            <Th className="hidden sm:table-cell">Status</Th>
            <Th className="w-12 sm:w-14">Actions</Th>
          </THead>
          <TBody>
            {data.items.map((j) => (
              <Tr key={j.id}>
                <Td className="font-medium text-slate-900">
                  <button
                    className="block max-w-[44vw] truncate hover:text-brand-700 hover:underline sm:max-w-none"
                    onClick={() => navigate(`/job-orders/${j.id}`)}
                  >
                    {j.title}
                  </button>
                  <div className="mt-0.5 flex max-w-[44vw] flex-wrap items-center gap-2 text-xs font-normal text-slate-500 sm:hidden">
                    <span className="truncate">
                      {j.clientName ? `${j.clientName} · ` : ""}
                      {j.location}
                    </span>
                    <StatusBadge status={j.status} />
                  </div>
                </Td>
                <Td className="hidden sm:table-cell">{j.clientName || "—"}</Td>
                <Td className="hidden sm:table-cell">{j.location}</Td>
                <Td className="hidden sm:table-cell">{formatExperience(j.minExperience)}</Td>
                <Td className="hidden sm:table-cell">{j.numberOfOpenings}</Td>
                <Td className="hidden max-w-xs sm:table-cell">
                  <SkillChips skills={j.requiredSkills.map((s) => s.skill.name)} max={3} />
                </Td>
                <Td className="hidden sm:table-cell">
                  <StatusBadge status={j.status} />
                </Td>
                <Td>
                  <ActionMenu
                    items={[
                      { label: "View", icon: FiEye, onClick: () => navigate(`/job-orders/${j.id}`) },
                      { label: "Edit", icon: FiEdit2, onClick: () => navigate(`/job-orders/${j.id}/edit`) },
                      // Deleting is admin-only on the server too; hiding it just avoids a dead button.
                      ...(isAdmin
                        ? [
                            {
                              label: "Delete",
                              icon: FiTrash2,
                              destructive: true,
                              onClick: () => handleDelete(j.id, j.title),
                            },
                          ]
                        : []),
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
