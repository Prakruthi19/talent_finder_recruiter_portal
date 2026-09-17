import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiPlus } from "react-icons/fi";
import { useGetTenantsQuery } from "../../api/tenantsApi";
import { useAppDispatch } from "../../store/hooks";
import { setSelectedTenant } from "../../store/tenantSlice";
import { useDebouncedValue } from "../../hooks/useDebouncedValue";
import { ListPageLayout } from "../../components/ui/ListPageLayout";
import { SearchInput } from "../../components/ui/SearchInput";
import { Pagination } from "../../components/ui/Pagination";
import { Button } from "../../components/ui/Button";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Table, THead, Th, TBody, Tr, Td } from "../../components/ui/Table";
import { EmptyState, ErrorState, LoadingState } from "../../components/ui/PageStates";

const PAGE_SIZE = 10;

export function TenantListPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search);

  const { data, isLoading, isError } = useGetTenantsQuery({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch || undefined,
  });

  return (
    <ListPageLayout
      title="Tenants"
      primaryAction={
        <Button onClick={() => navigate("/tenants/new")}>
          <FiPlus className="h-4 w-4" aria-hidden="true" />
          Create Tenant
        </Button>
      }
      toolbar={
        <SearchInput
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Search tenants..."
        />
      }
      footer={
        data && (
          <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onPageChange={setPage} />
        )
      }
    >
      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState />
      ) : !data?.items.length ? (
        <EmptyState label="No tenants yet. Create one to get started." />
      ) : (
        <Table>
          <THead>
            <Th>Tenant Name</Th>
            <Th>Tenant ID</Th>
            <Th>Status</Th>
          </THead>
          <TBody>
            {data.items.map((tenant) => (
              <Tr
                key={tenant.id}
                onClick={() => {
                  dispatch(setSelectedTenant(tenant.id));
                  navigate("/candidates");
                }}
              >
                <Td className="font-medium text-slate-900 group-hover:text-brand-700 group-hover:underline">
                  {tenant.name}
                </Td>
                <Td className="font-mono text-xs text-slate-500">{tenant.id}</Td>
                <Td>
                  <StatusBadge status={tenant.status} />
                </Td>
              </Tr>
            ))}
          </TBody>
        </Table>
      )}
    </ListPageLayout>
  );
}
