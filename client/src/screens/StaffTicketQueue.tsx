// IT Staff Ticket Queue (ui-spec §8).
//
// Columns are chosen against the labsheet's warning about an unreadable
// mega-grid: Category and Requested Priority are filterable but not columns,
// and Created Date loses to Updated because a queue asks what has gone quiet.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ApiRequestError,
  fetchStaffQueue,
  type Priority,
  type StaffQueueResponse,
  type StaffQueueRow,
  type TicketStatus,
} from '../api.js'
import { PriorityBadge, StatusBadge } from '../components/Badge.js'
import { Button } from '../components/Button.js'
import { FormField } from '../components/FormField.js'
import {
  EmptyState,
  ErrorState,
  ForbiddenState,
  LoadingState,
} from '../components/States.js'

const STATUSES: TicketStatus[] = [
  'NEW',
  'OPEN',
  'IN_PROGRESS',
  'WAITING_FOR_REQUESTER',
  'RESOLVED',
  'CLOSED',
  'REOPENED',
  'CANCELLED',
]

const PRIORITIES: Priority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

const OWNER_OPTIONS = [
  { value: '', label: 'Anyone' },
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'me', label: 'Assigned to me' },
]

/** Only the fields api-spec.md §8 whitelists; anything else is a 400. */
type SortField = 'ticketNo' | 'itPriority' | 'status' | 'lastActivityAt'
type SortDirection = 'asc' | 'desc'

type Filters = {
  search: string
  status: string
  itPriority: string
  ownerId: string
  sort: { field: SortField; direction: SortDirection }
  page: number
}

const DEFAULT_FILTERS: Filters = {
  search: '',
  status: '',
  itPriority: '',
  ownerId: '',
  sort: { field: 'itPriority', direction: 'desc' },
  page: 1,
}

type Phase = 'loading' | 'ready' | 'forbidden' | 'failed'

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function ariaSortFor(field: SortField, sort: Filters['sort']) {
  if (sort.field !== field) return 'none' as const
  return sort.direction === 'asc' ? ('ascending' as const) : ('descending' as const)
}

function SortButton({
  field,
  label,
  onSort,
}: {
  field: SortField
  label: string
  onSort: (field: SortField) => void
}) {
  return (
    <button type="button" className="my-tickets__sort-button" onClick={() => onSort(field)}>
      {label}
    </button>
  )
}

function OwnerCell({ owner }: { owner: StaffQueueRow['owner'] }) {
  if (owner) return <>{owner.displayName}</>
  // Not an empty cell: an empty cell reads as a loading failure (ui-spec §8).
  return <span className="staff-queue__unassigned">Unassigned</span>
}

export function StaffTicketQueue() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS)
  const [searchInput, setSearchInput] = useState('')
  const [response, setResponse] = useState<StaffQueueResponse | null>(null)
  const [phase, setPhase] = useState<Phase>('loading')
  const [retryNumber, setRetryNumber] = useState(0)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setFilters((current) =>
        current.search === searchInput ? current : { ...current, search: searchInput, page: 1 },
      )
    }, 300)
    return () => window.clearTimeout(timeoutId)
  }, [searchInput])

  useEffect(() => {
    let cancelled = false
    setResponse(null)
    setPhase('loading')

    fetchStaffQueue({
      search: filters.search,
      status: filters.status,
      itPriority: filters.itPriority,
      ownerId: filters.ownerId,
      sort: `${filters.sort.field}:${filters.sort.direction}`,
      page: filters.page,
    })
      .then((next) => {
        if (cancelled) return
        setResponse(next)
        setPhase('ready')
      })
      .catch((error) => {
        if (cancelled) return
        // Forbidden is its own state: it means something different from
        // "something broke", and retrying will not change it (ui-spec §4).
        setPhase(
          error instanceof ApiRequestError && error.status === 403
            ? 'forbidden'
            : 'failed',
        )
      })

    return () => {
      cancelled = true
    }
  }, [filters, retryNumber])

  const sortBy = useCallback((field: SortField) => {
    setFilters((current) => ({
      ...current,
      page: 1,
      sort: {
        field,
        direction:
          current.sort.field === field && current.sort.direction === 'asc'
            ? 'desc'
            : 'asc',
      },
    }))
  }, [])

  const update = useCallback((patch: Partial<Filters>) => {
    setFilters((current) => ({ ...current, ...patch, page: 1 }))
  }, [])

  /** What produced this result set — the server's word, for empty vs no-results. */
  const serverFiltered = useMemo(() => {
    const applied = response?.appliedFilters
    if (!applied) return false
    return Boolean(
      applied.search ?? applied.status ?? applied.itPriority ?? applied.categoryId ?? applied.ownerId,
    )
  }, [response])

  // What the user has set. Clear Filters answers to this as well, so it is
  // usable the moment a filter is chosen rather than after the round trip.
  const hasFilters =
    filters.search !== '' ||
    filters.status !== '' ||
    filters.itPriority !== '' ||
    filters.ownerId !== ''

  function clearFilters() {
    setSearchInput('')
    setFilters({ ...DEFAULT_FILTERS })
  }

  const rows = response?.data ?? []

  return (
    <div className="my-tickets-page staff-queue">
      <header className="my-tickets-page__header">
        <div>
          <h1>Ticket Queue</h1>
          <p>Every request across all requesters, most urgent first.</p>
        </div>
      </header>

      <div className="my-tickets__filters">
        <FormField id="queue-search" label="Search">
          <input
            type="search"
            placeholder="Search by ticket number or summary…"
            value={searchInput}
            disabled={phase === 'loading'}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </FormField>

        <FormField id="queue-status" label="Status">
          <select
            value={filters.status}
            disabled={phase === 'loading'}
            onChange={(event) => update({ status: event.target.value })}
          >
            <option value="">Any status</option>
            {STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </FormField>

        <FormField id="queue-it-priority" label="IT Priority">
          <select
            value={filters.itPriority}
            disabled={phase === 'loading'}
            onChange={(event) => update({ itPriority: event.target.value })}
          >
            <option value="">Any priority</option>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </FormField>

        <FormField id="queue-owner" label="Owner">
          <select
            value={filters.ownerId}
            disabled={phase === 'loading'}
            onChange={(event) => update({ ownerId: event.target.value })}
          >
            {OWNER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FormField>

        <Button
          variant="tertiary"
          onClick={clearFilters}
          disabled={!hasFilters && !serverFiltered}
        >
          Clear Filters
        </Button>
      </div>

      {phase === 'loading' ? <LoadingState label="Loading the queue…" /> : null}

      {phase === 'forbidden' ? (
        <ForbiddenState detail="The Ticket Queue is available to IT Staff and Administrators." />
      ) : null}

      {phase === 'failed' ? (
        <ErrorState
          title="The queue could not be loaded"
          detail="Something went wrong while fetching the queue."
          onRetry={() => setRetryNumber((value) => value + 1)}
        />
      ) : null}

      {phase === 'ready' && rows.length === 0 ? (
        serverFiltered ? (
          <EmptyState
            title="No tickets match these filters."
            detail="Adjust or clear the filters to see more of the queue."
          />
        ) : (
          <EmptyState
            title="No tickets in the queue."
            detail="Nothing is waiting for IT at the moment."
          />
        )
      ) : null}

      {phase === 'ready' && rows.length > 0 ? (
        <div className="my-tickets__table-container zen-scroll-x">
          <table className="my-tickets__table staff-queue__table">
            <thead>
              <tr>
                <th scope="col" aria-sort={ariaSortFor('ticketNo', filters.sort)}>
                  <SortButton field="ticketNo" label="Ticket No." onSort={sortBy} />
                </th>
                <th scope="col">Summary</th>
                <th scope="col">Requester</th>
                <th scope="col" aria-sort={ariaSortFor('itPriority', filters.sort)}>
                  <SortButton field="itPriority" label="IT Priority" onSort={sortBy} />
                </th>
                <th scope="col" aria-sort={ariaSortFor('status', filters.sort)}>
                  <SortButton field="status" label="Status" onSort={sortBy} />
                </th>
                <th scope="col">Owner</th>
                <th scope="col" aria-sort={ariaSortFor('lastActivityAt', filters.sort)}>
                  <SortButton field="lastActivityAt" label="Updated" onSort={sortBy} />
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                // data-label drives the table-to-cards switch below 768px,
                // the pattern lab-02 My Tickets established (ui-spec §8).
                <tr key={row.id}>
                  <td data-label="Ticket No.">
                    <Link to={`/staff/tickets/${row.id}`}>{row.ticketNo}</Link>
                  </td>
                  <td data-label="Summary">{row.summary}</td>
                  <td data-label="Requester">{row.requester.displayName}</td>
                  <td data-label="IT Priority">
                    <PriorityBadge value={row.itPriority} />
                  </td>
                  <td data-label="Status">
                    <StatusBadge value={row.status} />
                    {row.requesterResolvedAt ? (
                      // The queue's most actionable signal, invisible otherwise.
                      <span className="staff-queue__resolved-marker">
                        Requester says resolved
                      </span>
                    ) : null}
                  </td>
                  <td data-label="Owner">
                    <OwnerCell owner={row.owner} />
                  </td>
                  <td data-label="Updated">{formatDate(row.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
