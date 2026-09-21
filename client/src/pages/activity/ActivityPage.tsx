import { useState } from "react";
import { useGetAuditLogsQuery } from "../../api/dashboardApi";
import { useAppSelector } from "../../store/hooks";
import { useCurrentRole } from "../../hooks/useAuth";
import { TenantSelect } from "../../components/ui/TenantSelect";
import { Pagination } from "../../components/ui/Pagination";
import { Table, THead, Th, TBody, Tr, Td } from "../../components/ui/Table";
import { EmptyState, ErrorState, LoadingState } from "../../components/ui/PageStates";

const PAGE_SIZE = 15;

export function ActivityPage() {
  const tenantId = useAppSelector((s) => s.tenant.selectedTenantId);
  const role = useCurrentRole();
  const [page, setPage] = useState(1);
  const isAdmin = role === "ADMIN";
  // Skipped for non-admins: the server would answer 403 anyway.
  const { data, isLoading, isError } = useGetAuditLogsQuery(
    { tenantId: tenantId ?? "", page, pageSize: PAGE_SIZE },
    { skip: !tenantId || !isAdmin, refetchOnMountOrArgChange: true }
  );

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Activity</h1>
          <p className="text-xs text-slate-500">Who changed what in this tenant. Only tenant admins can see this.</p>
        </div>
        <TenantSelect />
      </div>

      <div className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
        {!tenantId ? (
          <EmptyState label="Select a tenant." />
        ) : role === undefined ? (
          <LoadingState />
        ) : !isAdmin ? (
          <EmptyState label="Only a tenant admin can see the activity log." />
        ) : isLoading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState />
        ) : !data?.items.length ? (
          <EmptyState label="No activity recorded yet. Add a candidate or shortlist someone and it will show up here." />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <THead>
                <Th>When</Th>
                <Th>Who</Th>
                <Th>What</Th>
              </THead>
              <TBody>
                {data.items.map((row) => (
                  <Tr key={row.id}>
                    <Td className="text-slate-500">{new Date(row.createdAt).toLocaleString()}</Td>
                    <Td className="font-medium text-slate-900">{row.user?.name ?? "Unknown user"}</Td>
                    <Td>{row.description}</Td>
                  </Tr>
                ))}
              </TBody>
            </Table>
          </div>
        )}
        {isAdmin && data && <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />}
      </div>
    </div>
  );
}
