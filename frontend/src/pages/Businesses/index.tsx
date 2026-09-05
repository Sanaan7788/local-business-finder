import { useBusinessList, useDeleteBusiness } from '../../hooks/useBusinesses'
import { formatNumber } from '../../lib/format'
import { Card } from '../../components/ui/Card'
import { PageHeader } from '../../components/ui/Heading'
import { EmptyState } from '../../components/ui/EmptyState'
import { ErrorState } from '../../components/ui/ErrorState'
import { LoadingBlock } from '../../components/ui/Spinner'
import type { BusinessListItem } from '../../types/business'
import { useBusinessFilters } from './useBusinessFilters'
import { BusinessFilters } from './BusinessFilters'
import { BusinessTable } from './BusinessTable'
import { BusinessCardList } from './BusinessCardList'
import { Pagination } from './Pagination'

export default function Businesses() {
  const filterState = useBusinessFilters()
  const { filters, set, hasActiveFilters, listParams } = filterState
  const { data, isPending, isError, error, refetch } = useBusinessList(listParams)
  const deleteBusiness = useDeleteBusiness()

  const businesses = data?.items ?? []
  const total = data?.total ?? 0

  const onSort = (field: string) => {
    if (field === filters.sort) set('dir', filters.dir === 'asc' ? 'desc' : 'asc')
    else { set('sort', field); set('dir', 'desc') }
  }

  const onDelete = (b: BusinessListItem) => {
    if (window.confirm(`Delete ${b.name}?`)) deleteBusiness.mutate(b.id)
  }

  const state = isPending ? (
    <LoadingBlock label="Loading businesses…" />
  ) : isError ? (
    <ErrorState error={error} onRetry={() => void refetch()} />
  ) : businesses.length === 0 ? (
    <EmptyState title="No businesses found" description={hasActiveFilters ? 'Try adjusting your filters' : 'Run the scraper to get started'} />
  ) : null

  return (
    <div className="space-y-5">
      <PageHeader title="Businesses" description={`${formatNumber(total)} total`} />

      <BusinessFilters {...filterState} />

      {state ? (
        <Card padding="none">{state}</Card>
      ) : (
        <>
          <Card padding="none" className="hidden overflow-hidden sm:block">
            <BusinessTable businesses={businesses} sort={filters.sort} dir={filters.dir} onSort={onSort} onDelete={onDelete} />
          </Card>
          <div className="sm:hidden">
            <BusinessCardList businesses={businesses} onDelete={onDelete} />
          </div>
        </>
      )}

      <Pagination page={filters.page} total={total} onPage={p => set('page', p)} />
    </div>
  )
}
