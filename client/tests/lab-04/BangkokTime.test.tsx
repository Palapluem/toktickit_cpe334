// UI-26 · lab-04 api-spec §1, BR-38 — every screen shows times in Asia/Bangkok, whatever zone the device is in.
// The reused Lab 2 and Lab 3 screens are checked here; the Lab 4 ones are UI-19. Expected text is written out, not computed.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import * as api from '../../src/api.js'
import { AttachmentSection } from '../../src/components/AttachmentSection.js'
import { PublicCommentsSection } from '../../src/components/ThreadSection.js'
import { SessionProvider } from '../../src/context/SessionContext.js'
import { CreateTicket } from '../../src/screens/CreateTicket.js'
import { MyTickets } from '../../src/screens/MyTickets.js'
import { RequesterTicketDetail } from '../../src/screens/RequesterTicketDetail.js'
import { StaffTicketDetail } from '../../src/screens/StaffTicketDetail.js'
import { StaffTicketQueue } from '../../src/screens/StaffTicketQueue.js'

vi.mock('../../src/api.js', async () => {
  const actual = await vi.importActual<typeof import('../../src/api.js')>('../../src/api.js')
  return {
    ...actual,
    fetchStaffTicket: vi.fn(),
    fetchTicketHistory: vi.fn(),
    fetchComments: vi.fn(),
    fetchInternalNotes: vi.fn(),
    fetchStaffQueue: vi.fn(),
    fetchTickets: vi.fn(),
    fetchCurrentUser: vi.fn(),
    fetchCategories: vi.fn(),
    fetchRelatedSystems: vi.fn(),
    createTicket: vi.fn(),
  }
})

// 03:12 UTC is 10:12 in Bangkok on the same date; 18:30 UTC is 01:30 on the next date.
const MORNING = '2026-10-04T03:12:09.000Z'
const EVENING = '2026-10-04T18:30:00.000Z'

const PERSON = { id: 'r-1', displayName: 'Jennifer Anderson', email: 'jennifer.anderson@example.ac.th' }

const STAFF_TICKET: api.StaffTicket = {
  id: 't-1',
  ticketNo: 'TKT-2026-000001',
  summary: 'Shared printer jams',
  description: 'Double-sided printing jams on the second sheet.',
  category: { id: 'c-1', name: 'Hardware' },
  relatedSystem: { id: 's-1', name: 'Printer' },
  requester: { id: 'r-1', displayName: 'Jennifer Anderson' },
  requestedPriority: 'MEDIUM',
  itPriority: 'HIGH',
  status: 'IN_PROGRESS',
  owner: { id: 's-1', displayName: 'Patricia Evans' },
  requesterResolvedAt: null,
  createdAt: EVENING,
  updatedAt: EVENING,
  version: 1,
  openActionCount: 0,
  attachments: [],
  assignableOwners: [{ id: 's-1', displayName: 'Patricia Evans' }],
  permittedTransitions: ['RESOLVED'],
  blockedTransitions: [],
}

const deviceZone = process.env.TZ

beforeEach(() => {
  vi.clearAllMocks()
  window.sessionStorage.clear()
  vi.mocked(api.fetchTicketHistory).mockResolvedValue([])
  vi.mocked(api.fetchComments).mockResolvedValue([])
  vi.mocked(api.fetchInternalNotes).mockResolvedValue([])
  vi.mocked(api.fetchCurrentUser).mockResolvedValue({ ...PERSON, role: 'REQUESTER', mustChangePassword: false })
  vi.mocked(api.fetchCategories).mockResolvedValue([{ id: 'category-hardware', name: 'Hardware' }])
  vi.mocked(api.fetchRelatedSystems).mockResolvedValue([{ id: 'system-email', name: 'Email' }])
})

afterEach(() => {
  if (deviceZone === undefined) delete process.env.TZ
  else process.env.TZ = deviceZone
})

describe.each(['UTC', 'America/Los_Angeles'])('UI-26 · a device set to %s', (zone) => {
  beforeEach(() => {
    process.env.TZ = zone
  })

  it('Staff Ticket Detail: the Ticket Date', async () => {
    vi.mocked(api.fetchStaffTicket).mockResolvedValue(STAFF_TICKET)
    render(
      <MemoryRouter initialEntries={['/staff/tickets/t-1']}>
        <Routes>
          <Route path="/staff/tickets/:id" element={<StaffTicketDetail />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByLabelText('Ticket Date')).toHaveValue('5 Oct 2026, 01:30')
  })

  it('Requester Ticket Detail: the Ticket Date', async () => {
    render(
      <MemoryRouter initialEntries={['/tickets/t-1']}>
        <RequesterTicketDetail
          ticket={{
            id: 't-1',
            ticketNo: 'TKT-2026-000001',
            createdAt: EVENING,
            updatedAt: EVENING,
            summary: 'Printer queue is stuck',
            description: 'Print jobs remain queued.',
            requestedPriority: 'MEDIUM',
            itPriority: 'MEDIUM',
            status: 'IN_PROGRESS',
            requester: PERSON,
            category: { id: 'c-1', name: 'Hardware' },
            relatedSystem: { id: 's-1', name: 'Printer' },
            owner: null,
            attachments: [],
          }}
        />
      </MemoryRouter>,
    )

    expect((await screen.findByText('Ticket Date')).nextElementSibling).toHaveTextContent('5 Oct 2026, 01:30')
  })

  it('Staff queue: the Updated column', async () => {
    vi.mocked(api.fetchStaffQueue).mockResolvedValue({
      data: [
        {
          id: 't-1',
          ticketNo: 'TKT-2026-000001',
          summary: 'Shared printer jams',
          category: { id: 'c-1', name: 'Hardware' },
          requester: { id: 'r-1', displayName: 'Jennifer Anderson' },
          requestedPriority: 'MEDIUM',
          itPriority: 'URGENT',
          status: 'IN_PROGRESS',
          owner: null,
          requesterResolvedAt: null,
          createdAt: MORNING,
          updatedAt: MORNING,
        },
      ],
      pagination: { page: 1, pageSize: 20, totalItems: 1, totalPages: 1, hasPreviousPage: false, hasNextPage: false },
      appliedFilters: { search: null, status: null, itPriority: null, categoryId: null, ownerId: null, sort: 'itPriority:desc' },
    })
    render(
      <MemoryRouter>
        <StaffTicketQueue />
      </MemoryRouter>,
    )

    const row = within(await screen.findByRole('table')).getAllByRole('row')[1]
    expect(within(row).getByText('4 Oct 2026, 10:12')).toBeInTheDocument()
  })

  it('Public comments: the time of an entry', async () => {
    vi.mocked(api.fetchComments).mockResolvedValue([
      { id: 'c-1', body: 'I restarted the laptop.', createdAt: MORNING, author: { id: 'r-1', displayName: 'Jennifer Anderson', role: 'REQUESTER' } },
    ])
    render(<PublicCommentsSection ticketId="t-1" />)

    expect(await screen.findByText('4 Oct 2026, 10:12')).toBeInTheDocument()
  })

  it('Attachments: when a file was uploaded and when it was removed', async () => {
    render(
      <AttachmentSection
        ticketId="t-1"
        attachments={[
          { id: 'a-1', originalFilename: 'screen.png', mimeType: 'image/png', sizeBytes: 2048, createdAt: MORNING, removedAt: null, removedReason: null, isDownloadable: true },
          { id: 'a-2', originalFilename: 'old.png', mimeType: 'image/png', sizeBytes: 1024, createdAt: MORNING, removedAt: EVENING, removedReason: 'Wrong file', isDownloadable: false },
        ]}
        activeCount={1}
        activeLimit={5}
        onAdd={vi.fn()}
        onRemove={vi.fn()}
        onDownload={vi.fn()}
      />,
    )

    expect(await screen.findByText(/uploaded 4 Oct 2026, 10:12/)).toBeInTheDocument()
    expect(screen.getByText('5 Oct 2026, 01:30')).toBeInTheDocument()
  })

  it('My Tickets: the dates, which can fall on another calendar day', async () => {
    vi.mocked(api.fetchTickets).mockResolvedValue({
      data: [
        {
          id: 't-1',
          ticketNo: 'TKT-2026-000001',
          createdAt: EVENING,
          updatedAt: EVENING,
          summary: 'Printer queue is stuck',
          requestedPriority: 'HIGH',
          itPriority: 'URGENT',
          status: 'NEW',
          owner: null,
          category: { id: 'category-hardware', name: 'Hardware' },
          relatedSystem: { id: 'system-email', name: 'Email' },
          activeAttachmentCount: 0,
        },
      ],
      pagination: { page: 1, pageSize: 10, totalItems: 1, totalPages: 1, hasPreviousPage: false, hasNextPage: false },
      appliedFilters: { search: null, categoryId: null, relatedSystemId: null, requestedPriority: null, itPriority: null, status: null, sort: 'createdAt:desc' },
    })
    render(
      <MemoryRouter initialEntries={['/tickets']}>
        <SessionProvider>
          <MyTickets />
        </SessionProvider>
      </MemoryRouter>,
    )

    const row = within(await screen.findByRole('table')).getAllByRole('row')[1]
    expect(within(row).getAllByText('05 Oct 2026')).toHaveLength(2)
  })

  it('Create Ticket: the Ticket Date shown after submitting', async () => {
    vi.mocked(api.createTicket).mockResolvedValue({
      id: 't-1',
      ticketNo: 'TKT-2026-000001',
      createdAt: EVENING,
      updatedAt: EVENING,
      summary: 'Printer queue is stuck',
      description: 'Print jobs remain queued.',
      requestedPriority: 'MEDIUM',
      itPriority: 'MEDIUM',
      status: 'NEW',
      requester: PERSON,
      category: { id: 'category-hardware', name: 'Hardware' },
      relatedSystem: { id: 'system-email', name: 'Email' },
      owner: null,
      attachments: [],
      attachmentFailures: [],
    })
    render(
      <MemoryRouter initialEntries={['/tickets/new']}>
        <SessionProvider>
          <CreateTicket />
        </SessionProvider>
      </MemoryRouter>,
    )
    await screen.findByRole('option', { name: 'Hardware' })
    await screen.findByRole('option', { name: 'Email' })
    await userEvent.selectOptions(screen.getByLabelText(/^Category/), 'category-hardware')
    await userEvent.selectOptions(screen.getByLabelText(/^Related System/), 'system-email')
    await userEvent.selectOptions(screen.getByLabelText(/^Requested Priority/), 'MEDIUM')
    await userEvent.type(screen.getByLabelText(/^Summary/), 'Printer queue is stuck')
    await userEvent.type(screen.getByLabelText(/^Description/), 'Print jobs remain queued.')
    await userEvent.click(screen.getByRole('button', { name: 'Submit Ticket' }))

    expect(await screen.findByLabelText('Ticket Date')).toHaveValue('5 Oct 2026, 01:30')
  })
})
