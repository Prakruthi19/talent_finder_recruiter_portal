import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiPlus, FiEye, FiEdit2, FiTrash2 } from "react-icons/fi";
import {
  useGetCandidatesQuery,
  useGetCandidateSummaryQuery,
  useDeleteCandidateMutation,
  CandidateListParams,
} from "../../api/candidatesApi";
import { useAppSelector } from "../../store/hooks";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { ListPageLayout } from "../../components/ui/ListPageLayout";
import { SearchInput } from "../../components/ui/SearchInput";
import { SortSelect } from "../../components/ui/SortSelect";
import { Pagination } from "../../components/ui/Pagination";
import { Button } from "../../components/ui/Button";
import { SummaryCard } from "../../components/ui/SummaryCard";
import { SkillChips } from "../../components/ui/SkillChips";
import { ActionMenu } from "../../components/ui/ActionMenu";
import { Table, THead, Th, TBody, Tr, Td } from "../../components/ui/Table";
import { EmptyState, ErrorState, LoadingState } from "../../components/ui/PageStates";
import { formatExperience } from "../../lib/format";

const PAGE_SIZE = 10;

const SORT_OPTIONS = [
  { value: "fullName:asc", label: "Name (A-Z)" },
  { value: "fullName:desc", label: "Name (Z-A)" },
  { value: "experienceYears:desc", label: "Experience (High-Low)" },
  { value: "experienceYears:asc", label: "Experience (Low-High)" },
  { value: "createdAt:desc", label: "Newest First" },
];

export function CandidateListPage() {
  const navigate = useNavigate();
  const tenantId = useAppSelector((s) => s.tenant.selectedTenantId);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("createdAt:desc");
  const debouncedSearch = useDebouncedValue(search);
  const [sortBy, sortDir] = sort.split(":") as [CandidateListParams["sortBy"], CandidateListParams["sortDir"]];

  const { data, isLoading, isError } = useGetCandidatesQuery(
    tenantId ? { page, pageSize: PAGE_SIZE, search: debouncedSearch || undefined, sortBy, sortDir } : undefined,
    { skip: !tenantId }
  );
  const { data: summary } = useGetCandidateSummaryQuery(undefined, { skip: !tenantId });
  const [deleteCandidate] = useDeleteCandidateMutation();

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete candidate "${name}"? This cannot be undone.`)) return;
    await deleteCandidate(id);
  }

  return (
    <ListPageLayout
      title="Candidates"
      showTenantSelect
      primaryAction={
        <Button onClick={() => navigate("/candidates/new")}>
          <FiPlus className="h-4 w-4" aria-hidden="true" />
          Add Candidate
        </Button>
      }
      summaryCards={
        <>
          <SummaryCard label="Total Candidates" value={summary?.total ?? "–"} />
          <SummaryCard label="Added This Week" value={summary?.addedThisWeek ?? "–"} />
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
            placeholder="Search by name, location, skill..."
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
        <EmptyState label="Select a tenant to view candidates." />
      ) : isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState />
      ) : !data?.items.length ? (
        <EmptyState label="No candidates found. Add one to get started." />
      ) : (
        <Table>
          <THead>
            <Th>Name</Th>
            <Th>Location</Th>
            <Th>Exp</Th>
            <Th>Skills</Th>
            <Th>Actions</Th>
          </THead>
          <TBody>
            {data.items.map((c) => (
              <Tr key={c.id}>
                <Td className="font-medium text-slate-900">
                  <button
                    className="hover:text-brand-700 hover:underline"
                    onClick={() => navigate(`/candidates/${c.id}`)}
                  >
                    {c.fullName}
                  </button>
                </Td>
                <Td>{c.location || "—"}</Td>
                <Td>{formatExperience(c.experienceYears)}</Td>
                <Td className="max-w-xs">
                  <SkillChips skills={c.skills.map((s) => s.skill.name)} max={3} />
                </Td>
                <Td>
                  <ActionMenu
                    items={[
                      { label: "View", icon: FiEye, onClick: () => navigate(`/candidates/${c.id}`) },
                      { label: "Edit", icon: FiEdit2, onClick: () => navigate(`/candidates/${c.id}/edit`) },
                      {
                        label: "Delete",
                        icon: FiTrash2,
                        destructive: true,
                        onClick: () => handleDelete(c.id, c.fullName),
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
