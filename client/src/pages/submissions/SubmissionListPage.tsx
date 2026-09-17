import { useState } from "react";
import { Link } from "react-router-dom";
import {
  useGetSubmissionsQuery,
  useGetSubmissionSummaryQuery,
  SubmissionListParams,
} from "../../api/submissionsApi";
import { useAppSelector } from "../../store/hooks";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { ListPageLayout } from "../../components/ui/ListPageLayout";
import { SearchInput } from "../../components/ui/SearchInput";
import { SortSelect } from "../../components/ui/SortSelect";
import { Pagination } from "../../components/ui/Pagination";
import { SummaryCard } from "../../components/ui/SummaryCard";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Table, THead, Th, TBody, Tr, Td } from "../../components/ui/Table";
import { EmptyState, ErrorState, LoadingState } from "../../components/ui/PageStates";
import { formatDate } from "../../lib/format";

const PAGE_SIZE = 10;

const SORT_OPTIONS = [
  { value: "createdAt:desc", label: "Newest First" },
  { value: "createdAt:asc", label: "Oldest First" },
  { value: "status:asc", label: "Status (A-Z)" },
];

export function SubmissionListPage() {
  const tenantId = useAppSelector((s) => s.tenant.selectedTenantId);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("createdAt:desc");
  const debouncedSearch = useDebouncedValue(search);
  const [sortBy, sortDir] = sort.split(":") as [SubmissionListParams["sortBy"], SubmissionListParams["sortDir"]];

  const { data, isLoading, isError } = useGetSubmissionsQuery(
    tenantId ? { page, pageSize: PAGE_SIZE, search: debouncedSearch || undefined, sortBy, sortDir } : undefined,
    { skip: !tenantId }
  );
  const { data: summary } = useGetSubmissionSummaryQuery(undefined, { skip: !tenantId });

  return (
    <ListPageLayout
      title="Submissions"
      showTenantSelect
      summaryCards={
        <>
          <SummaryCard label="Total Submissions" value={summary?.total ?? "–"} />
          <SummaryCard label="Shortlisted" value={summary?.shortlistedCount ?? "–"} />
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
            placeholder="Search by candidate or job order..."
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
        <EmptyState label="Select a tenant to view submissions." />
      ) : isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState />
      ) : !data?.items.length ? (
        <EmptyState label="No submissions yet. Shortlist a candidate from a Job Order to get started." />
      ) : (
        <Table>
          <THead>
            <Th>Job Order</Th>
            <Th>Candidate</Th>
            <Th>Status</Th>
            <Th>Shortlisted On</Th>
          </THead>
          <TBody>
            {data.items.map((s) => (
              <Tr key={s.id}>
                <Td className="font-medium text-slate-900">
                  <Link to={`/job-orders/${s.jobOrderId}`} className="hover:text-brand-700 hover:underline">
                    {s.jobOrder?.title ?? "—"}
                  </Link>
                </Td>
                <Td>
                  <Link to={`/candidates/${s.candidateId}`} className="hover:text-brand-700 hover:underline">
                    {s.candidate?.fullName ?? "—"}
                  </Link>
                </Td>
                <Td>
                  <StatusBadge status={s.status} />
                </Td>
                <Td>{formatDate(s.createdAt)}</Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </ListPageLayout>
  );
}
