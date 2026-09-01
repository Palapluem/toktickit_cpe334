import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  fetchCategories,
  fetchTickets,
  type Category,
  type Priority,
  type TicketListItem,
  type TicketListQuery,
  type TicketListResponse,
  type TicketStatus,
} from '../api.js'
import { Button } from '../components/Button.js'
import { PriorityBadge, StatusBadge } from '../components/Badge.js'
import { FormField } from '../components/FormField.js'
import { EmptyState, ErrorState, LoadingState } from '../components/States.js'
import { useRequester } from '../context/RequesterContext.js'

const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
const STATUSES: TicketStatus[] = [
  'NEW',
  'ASSIGNED',
  'IN_PROGRESS',
  'PENDING_REQUESTER',
  'RESOLVED',
  'CLOSED',
  'CANCELLED',
]

type SortField =
  | 'ticketNo'
  | 'createdAt'
  | 'summary'
  | 'updatedAt'
type SortDirection = 'asc' | 'desc'
type SortValue = `${SortField}:${SortDirection}`

type FilterState = {
  search: string
  categoryId: string
  requestedPriority: Priority | ''
  itPriority: Priority | ''
  status: TicketStatus | ''
  sort: SortValue
  page: number
  pageSize: number
}

const DEFAULT_FILTERS: FilterState = {
  search: '',
  categoryId: '',
  requestedPriority: '',
  itPriority: '',
  status: '',
  sort: 'createdAt:desc',
  page: 1,
  pageSize: 10,
}

const SEARCH_DEBOUNCE_MS = 300

function toTicketQuery(filters: FilterState): TicketListQuery {
  const query: TicketListQuery = {
    sort: filters.sort,
    page: filters.page,
    pageSize: filters.pageSize,
  }

  if (filters.search.trim()) query.search = filters.search.trim()
  if (filters.categoryId) query.categoryId = filters.categoryId
  if (filters.requestedPriority) {
    query.requestedPriority = filters.requestedPriority
  }
  if (filters.itPriority) query.itPriority = filters.itPriority
  if (filters.status) query.status = filters.status

  return query
}

function hasAppliedFilters(response: TicketListResponse): boolean {
  const { appliedFilters } = response
  return Boolean(
    appliedFilters.search ||
      appliedFilters.categoryId ||
      appliedFilters.relatedSystemId ||
      appliedFilters.requestedPriority ||
      appliedFilters.itPriority ||
      appliedFilters.status,
  )
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value))
}

function CreateTicketLink() {
  return (
    <Link className="zen-button zen-button--primary my-tickets__link-button" to="/tickets/new">
      Create Ticket
    </Link>
  )
}

function SortButton({
  field,
  label,
  sort,
  onSort,
}: {
  field: SortField
  label: string
  sort: SortValue
  onSort: (field: SortField) => void
}) {
  const active = sort.startsWith(`${field}:`)
  const direction = sort.endsWith(':asc') ? 'ascending' : 'descending'
  return (
    <Button
      variant="tertiary"
      className="my-tickets__sort-button"
      type="button"
      aria-label={`Sort by ${label}`}
      aria-pressed={active}
      onClick={() => onSort(field)}
    >
      {label}
      <span aria-hidden="true"> {active ? (direction === 'ascending' ? '↑' : '↓') : '↕'}</span>
    </Button>
  )
}

function AttachmentCount({ count }: { count: number }) {
  if (count < 1) return null
  return (
    <span
      className="my-tickets__attachment-count"
      aria-label={`${count} active attachment${count === 1 ? '' : 's'}`}
    >
      📎 {count}
    </span>
  )
}

function TicketRow({ ticket }: { ticket: TicketListItem }) {
  return (
    <tr>
      <td data-label="Ticket No.">
        <Link to={`/tickets/${ticket.id}`}>{ticket.ticketNo}</Link>
      </td>
      <td data-label="Created Date">{formatDate(ticket.createdAt)}</td>
      <td data-label="Summary">
        <span className="my-tickets__summary">
          {ticket.summary}
          <AttachmentCount count={ticket.activeAttachmentCount} />
        </span>
      </td>
      <td data-label="Category">{ticket.category.name}</td>
      <td data-label="Requested Priority">
        <PriorityBadge value={ticket.requestedPriority} />
      </td>
      <td data-label="IT Priority">
        <PriorityBadge value={ticket.itPriority} />
      </td>
      <td data-label="Current Status">
        <StatusBadge value={ticket.status} />
      </td>
      <td data-label="Last Updated">{formatDate(ticket.updatedAt)}</td>
    </tr>
  )
}

function LoadingResults() {
  return (
    <div className="my-tickets__loading-results">
      <LoadingState label="Loading tickets…" />
      <div className="my-tickets__skeleton" aria-hidden="true">
        {Array.from({ length: 3 }, (_, row) => (
          <div className="my-tickets__skeleton-row" key={row}>
            {Array.from({ length: 4 }, (_, block) => (
              <span className="my-tickets__skeleton-block" key={block} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function MyTickets() {
  const { requester, status: requesterStatus } = useRequester()
  const navigate = useNavigate()
  const [categories, setCategories] = useState<Category[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(false)
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)
  const [searchInput, setSearchInput] = useState(DEFAULT_FILTERS.search)
  const [response, setResponse] = useState<TicketListResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [retryNumber, setRetryNumber] = useState(0)
  const requesterId = requester?.id ?? null

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const nextSearch = searchInput.trim()
      setFilters((current) => {
        if (current.search === nextSearch) return current
        return { ...current, search: nextSearch, page: 1 }
      })
    }, SEARCH_DEBOUNCE_MS)

    return () => window.clearTimeout(timeoutId)
  }, [searchInput])

  useEffect(() => {
    if (!requesterId) {
      setCategories([])
      setCategoriesLoading(false)
      return
    }

    let cancelled = false
    setCategoriesLoading(true)
    fetchCategories(requesterId)
      .then((rows) => {
        if (!cancelled) setCategories(rows)
      })
      .catch(() => {
        if (!cancelled) setCategories([])
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [requesterId])

  useEffect(() => {
    if (!requesterId) {
      setResponse(null)
      setLoading(false)
      setError(false)
      return
    }

    let cancelled = false
    setResponse(null)
    setLoading(true)
    setError(false)

    fetchTickets(requesterId, toTicketQuery(filters))
      .then((nextResponse) => {
        if (!cancelled) setResponse(nextResponse)
      })
      .catch(() => {
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [filters, requesterId, retryNumber])

  const updateFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K],
  ) => {
    setFilters((current) => ({
      ...current,
      [key]: value,
      page: 1,
    }))
  }

  function clearFilters() {
    setSearchInput('')
    setFilters(DEFAULT_FILTERS)
  }

  function sortBy(field: SortField) {
    setFilters((current) => {
      const currentDirection = current.sort.startsWith(`${field}:`)
        ? current.sort.endsWith(':asc')
          ? 'asc'
          : 'desc'
        : null
      const nextDirection: SortDirection = currentDirection === 'asc' ? 'desc' : 'asc'
      return {
        ...current,
        sort: `${field}:${nextDirection}` as SortValue,
        page: 1,
      }
    })
  }

  const filterDisabled = loading || categoriesLoading
  const pageRange = useMemo(() => {
    if (!response) return { start: 0, end: 0 }
    const start = response.data.length > 0
      ? (response.pagination.page - 1) * response.pagination.pageSize + 1
      : 0
    const end = response.data.length > 0
      ? start + response.data.length - 1
      : 0
    return { start, end }
  }, [response])

  if (requesterStatus === 'loading') {
    return <LoadingState label="Loading requester…" />
  }

  if (!requester) {
    return (
      <EmptyState
        title="No requester selected"
        detail="Choose a development requester before viewing tickets."
        action={
          <Button variant="primary" onClick={() => navigate('/select-requester')}>
            Select Requester
          </Button>
        }
      />
    )
  }

  return (
    <div className="my-tickets-page">
      <header className="my-tickets-page__header">
        <div>
          <p className="zen-page-kicker">Requester workspace</p>
          <h1>My Tickets</h1>
          <p>View and track all of your support requests.</p>
        </div>
        <div className="my-tickets-page__actions">
          <Button
            variant="secondary"
            disabled={filterDisabled}
            onClick={clearFilters}
          >
            Clear Filters
          </Button>
          <Button variant="primary" onClick={() => navigate('/tickets/new')}>
            Create Ticket
          </Button>
        </div>
      </header>

      <section className="zen-card my-tickets__filters" aria-label="Ticket filters">
        <FormField id="ticket-search" label="Search">
          <input
            type="search"
            placeholder="Search by ticket number or summary…"
            value={searchInput}
            disabled={filterDisabled}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </FormField>

        <FormField id="ticket-category" label="Category">
          <select
            value={filters.categoryId}
            disabled={filterDisabled}
            onChange={(event) => updateFilter('categoryId', event.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField id="ticket-requested-priority" label="Requested Priority">
          <select
            value={filters.requestedPriority}
            disabled={filterDisabled}
            onChange={(event) =>
              updateFilter('requestedPriority', event.target.value as Priority | '')
            }
          >
            <option value="">All Requested Priorities</option>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </FormField>

        <FormField id="ticket-it-priority" label="IT Priority">
          <select
            value={filters.itPriority}
            disabled={filterDisabled}
            onChange={(event) =>
              updateFilter('itPriority', event.target.value as Priority | '')
            }
          >
            <option value="">All IT Priorities</option>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </FormField>

        <FormField id="ticket-status" label="Current Status">
          <select
            value={filters.status}
            disabled={filterDisabled}
            onChange={(event) =>
              updateFilter('status', event.target.value as TicketStatus | '')
            }
          >
            <option value="">All Current Statuses</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </FormField>
      </section>

      {loading ? <LoadingResults /> : null}

      {!loading && error ? (
        <ErrorState
          title="Could not load tickets"
          detail="The service did not respond. Your filters were kept; try again."
          onRetry={() => setRetryNumber((number) => number + 1)}
        />
      ) : null}

      {!loading && !error && response && response.data.length === 0 ? (
        hasAppliedFilters(response) ? (
          <EmptyState
            title="No tickets match these filters."
            detail="Try changing or clearing the filters."
            action={
              <Button variant="secondary" onClick={clearFilters}>
                Clear Filters
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="You have not created any tickets yet."
            detail="Create a ticket to start tracking a support request."
            action={<CreateTicketLink />}
          />
        )
      ) : null}

      {!loading && !error && response && response.data.length > 0 ? (
        <>
          <div className="zen-card my-tickets__table-card">
            <div className="my-tickets__table-container zen-scroll-x">
              <table className="my-tickets__table">
                <thead>
                  <tr>
                    <th scope="col">
                      <SortButton field="ticketNo" label="Ticket No." sort={filters.sort} onSort={sortBy} />
                    </th>
                    <th scope="col">
                      <SortButton field="createdAt" label="Created Date" sort={filters.sort} onSort={sortBy} />
                    </th>
                    <th scope="col">
                      <SortButton field="summary" label="Summary" sort={filters.sort} onSort={sortBy} />
                    </th>
                    <th scope="col">Category</th>
                    <th scope="col">Requested Priority</th>
                    <th scope="col">IT Priority</th>
                    <th scope="col">Current Status</th>
                    <th scope="col">
                      <SortButton field="updatedAt" label="Last Updated" sort={filters.sort} onSort={sortBy} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {response.data.map((ticket) => (
                    <TicketRow key={ticket.id} ticket={ticket} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="my-tickets__pagination">
            <p>
              Showing {pageRange.start} to {pageRange.end} of {response.pagination.totalItems} tickets
            </p>
            <nav aria-label="Ticket pagination" className="my-tickets__pagination-controls">
              <Button
                variant="secondary"
                disabled={!response.pagination.hasPreviousPage}
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    page: current.page - 1,
                    pageSize: response.pagination.pageSize,
                  }))
                }
              >
                Previous
              </Button>
              {Array.from({ length: response.pagination.totalPages }, (_, index) => index + 1).map((page) => (
                <Button
                  key={page}
                  variant={page === response.pagination.page ? 'primary' : 'tertiary'}
                  aria-current={page === response.pagination.page ? 'page' : undefined}
                  onClick={() =>
                    setFilters((current) => ({
                      ...current,
                      page,
                      pageSize: response.pagination.pageSize,
                    }))
                  }
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="secondary"
                disabled={!response.pagination.hasNextPage}
                onClick={() =>
                  setFilters((current) => ({
                    ...current,
                    page: current.page + 1,
                    pageSize: response.pagination.pageSize,
                  }))
                }
              >
                Next
              </Button>
            </nav>
          </div>
        </>
      ) : null}
    </div>
  )
}
