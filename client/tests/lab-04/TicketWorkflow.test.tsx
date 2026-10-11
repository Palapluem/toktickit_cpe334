// UI-11 to UI-13, UI-19 · lab-04 AC-18, AC-21, AC-23, BR-28, BR-30; ui-spec §6, §7 — the status control, its feedback and the history.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import * as api from '../../src/api.js'
import { RequesterTicketDetail } from '../../src/screens/RequesterTicketDetail.js'
import { StaffTicketDetail } from '../../src/screens/StaffTicketDetail.js'

vi.mock('../../src/api.js', async () => {
  const actual = await vi.importActual<typeof import('../../src/api.js')>('../../src/api.js')
  return {
    ...actual,
    fetchStaffTicket: vi.fn(),
    setTicketStatus: vi.fn(),
    fetchTicketHistory: vi.fn(),
    fetchActions: vi.fn(),
    fetchComments: vi.fn(),
    fetchInternalNotes: vi.fn(),
  }
})

const fetchStaffTicketMock = vi.mocked(api.fetchStaffTicket)
const setTicketStatusMock = vi.mocked(api.setTicketStatus)
const fetchHistoryMock = vi.mocked(api.fetchTicketHistory)

const BASE: api.StaffTicket = {
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
  createdAt: '2026-09-01T04:00:00.000Z',
  updatedAt: '2026-09-08T06:00:00.000Z',
  version: 1,
  openActionCount: 0,
  attachments: [],
  assignableOwners: [{ id: 's-1', displayName: 'Patricia Evans' }],
  permittedTransitions: ['WAITING_FOR_REQUESTER', 'RESOLVED', 'CANCELLED'],
  blockedTransitions: [],
}

const BLOCKED: api.StaffTicket = {
  ...BASE,
  openActionCount: 2,
  permittedTransitions: ['WAITING_FOR_REQUESTER', 'CANCELLED'],
  blockedTransitions: [{ status: 'RESOLVED', reason: 'OPEN_ACTIONS', openActionCount: 2 }],
}

const RESOLVED: api.StaffTicket = {
  ...BASE,
  status: 'RESOLVED',
  version: 2,
  updatedAt: '2026-09-08T07:00:00.000Z',
  permittedTransitions: ['CLOSED', 'REOPENED'],
}

const SUMMARY = (over: Partial<api.StatusChange> = {}): api.StatusChange => ({
  id: 't-1',
  status: 'RESOLVED',
  version: 2,
  updatedAt: '2026-09-08T07:00:00.000Z',
  permittedTransitions: ['CLOSED', 'REOPENED'],
  cancelledActionCount: 0,
  ...over,
})

function renderStaff() {
  return render(
    <MemoryRouter initialEntries={['/staff/tickets/t-1']}>
      <Routes>
        <Route path="/staff/tickets/:id" element={<StaffTicketDetail />} />
      </Routes>
    </MemoryRouter>,
  )
}

const control = async () => screen.findByRole('combobox', { name: 'Status' })
const offered = (select: HTMLElement) =>
  within(select)
    .getAllByRole('option')
    .map((option) => (option as HTMLOptionElement).value)
    .filter((value) => value !== '')

beforeEach(() => {
  vi.clearAllMocks()
  fetchStaffTicketMock.mockResolvedValue(BASE)
  fetchHistoryMock.mockResolvedValue([])
  vi.mocked(api.fetchActions).mockResolvedValue([])
  vi.mocked(api.fetchComments).mockResolvedValue([])
  vi.mocked(api.fetchInternalNotes).mockResolvedValue([])
})

describe('UI-11 · AC-18 · the status control offers what the server permits and says what it holds back', () => {
  it('lists exactly the permitted transitions', async () => {
    fetchStaffTicketMock.mockResolvedValue(BLOCKED)
    renderStaff()

    expect(offered(await control())).toEqual(['WAITING_FOR_REQUESTER', 'CANCELLED'])
  })

  it('explains the omission with the open count and links to the Actions section', async () => {
    fetchStaffTicketMock.mockResolvedValue(BLOCKED)
    renderStaff()
    await control()

    expect(
      screen.getByText('Resolved becomes available when the 2 open Actions are completed or cancelled.'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /go to actions taken/i })).toHaveAttribute('href', '#actions-taken')
  })

  it('names both statuses when both are held back, and uses the singular for one open Action', async () => {
    fetchStaffTicketMock.mockResolvedValue({
      ...BLOCKED,
      status: 'RESOLVED',
      openActionCount: 1,
      permittedTransitions: ['REOPENED'],
      blockedTransitions: [
        { status: 'RESOLVED', reason: 'OPEN_ACTIONS', openActionCount: 1 },
        { status: 'CLOSED', reason: 'OPEN_ACTIONS', openActionCount: 1 },
      ],
    })
    renderStaff()
    await control()

    expect(
      screen.getByText('Resolved and Closed become available when the 1 open Action is completed or cancelled.'),
    ).toBeInTheDocument()
  })

  it('says nothing about a gate when nothing is held back (positive control: the control is there)', async () => {
    renderStaff()

    expect(offered(await control())).toContain('RESOLVED')
    expect(screen.queryByText(/become(s)? available/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /go to actions taken/i })).not.toBeInTheDocument()
  })
})

describe('UI-12 · AC-21 · what a status change shows', () => {
  it('sends the version the screen holds, then refreshes the badge and the controls and announces it', async () => {
    setTicketStatusMock.mockResolvedValue(SUMMARY())
    fetchStaffTicketMock.mockResolvedValueOnce(BASE).mockResolvedValue(RESOLVED)
    renderStaff()

    await userEvent.selectOptions(await control(), 'RESOLVED')

    await waitFor(() => expect(setTicketStatusMock).toHaveBeenCalledWith('t-1', 'RESOLVED', 1))
    expect(await screen.findByText('Status changed to Resolved.')).toBeInTheDocument()
    expect(screen.getByText('Status changed to Resolved.').closest('[aria-live="polite"]')).not.toBeNull()
    await waitFor(() => expect(offered(screen.getByRole('combobox', { name: 'Status' }))).toEqual(['CLOSED', 'REOPENED']))
    expect(screen.getAllByText('RESOLVED').length).toBeGreaterThan(0)
  })

  it('keeps the previous status and shows the open count when the server refuses to resolve', async () => {
    setTicketStatusMock.mockRejectedValue(
      new api.ApiRequestError('This Ticket still has open Actions.', [], 409, 'OPEN_ACTIONS_BLOCK_RESOLUTION', {
        openActionCount: 2,
      }),
    )
    fetchStaffTicketMock.mockResolvedValueOnce(BASE).mockResolvedValue(BLOCKED)
    renderStaff()

    await userEvent.selectOptions(await control(), 'RESOLVED')

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(/2 open Actions/)
    expect(fetchStaffTicketMock).toHaveBeenCalledTimes(2)
    expect(screen.getByText('IN_PROGRESS', { selector: '.zen-badge' })).toBeInTheDocument()
    expect(screen.queryByText(/Status changed to/)).not.toBeInTheDocument()
    expect(await screen.findByText(/become(s)? available/i)).toBeInTheDocument()
  })

  it('tells the user the Ticket changed, and shows the latest status, on a stale version', async () => {
    setTicketStatusMock.mockRejectedValue(
      new api.ApiRequestError('This Ticket was changed by someone else.', [], 409, 'STALE_VERSION', {
        currentVersion: 3,
        currentStatus: 'WAITING_FOR_REQUESTER',
      }),
    )
    fetchStaffTicketMock
      .mockResolvedValueOnce(BASE)
      .mockResolvedValue({ ...BASE, status: 'WAITING_FOR_REQUESTER', version: 3, permittedTransitions: ['IN_PROGRESS', 'RESOLVED', 'CANCELLED'] })
    renderStaff()

    await userEvent.selectOptions(await control(), 'RESOLVED')

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This Ticket changed since you opened it. The latest status is shown — review and try again.',
    )
    expect(await screen.findByText('WAITING_FOR_REQUESTER', { selector: '.zen-badge' })).toBeInTheDocument()
    expect(offered(screen.getByRole('combobox', { name: 'Status' }))).toEqual(['IN_PROGRESS', 'RESOLVED', 'CANCELLED'])
  })

  it('shows any other refusal as it is and leaves the screen alone', async () => {
    setTicketStatusMock.mockRejectedValue(new api.ApiRequestError('Your role may not make this status change.', [], 403, 'FORBIDDEN'))
    renderStaff()

    await userEvent.selectOptions(await control(), 'RESOLVED')

    expect(await screen.findByRole('alert')).toHaveTextContent('Your role may not make this status change.')
    expect(fetchStaffTicketMock).toHaveBeenCalledTimes(1)
  })
})

describe('UI-12 · AC-17 · cancelling a Ticket asks first and says what else will be cancelled', () => {
  it('asks, naming the open Actions, and sends nothing until it is confirmed', async () => {
    setTicketStatusMock.mockResolvedValue(SUMMARY({ status: 'CANCELLED', permittedTransitions: [], cancelledActionCount: 2 }))
    fetchStaffTicketMock.mockResolvedValueOnce(BLOCKED).mockResolvedValue({ ...BLOCKED, status: 'CANCELLED', version: 2, openActionCount: 0, permittedTransitions: [], blockedTransitions: [] })
    renderStaff()

    await userEvent.selectOptions(await control(), 'CANCELLED')

    expect(screen.getByText('Cancel this Ticket? 2 open Actions will also be cancelled.')).toBeInTheDocument()
    expect(setTicketStatusMock).not.toHaveBeenCalled()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel Ticket' }))
    await waitFor(() => expect(setTicketStatusMock).toHaveBeenCalledWith('t-1', 'CANCELLED', 1))
    expect(await screen.findByText('Status changed to Cancelled.')).toBeInTheDocument()
  })

  it('asks only whether to cancel when no Action is open', async () => {
    renderStaff()

    await userEvent.selectOptions(await control(), 'CANCELLED')

    expect(screen.getByText('Cancel this Ticket?')).toBeInTheDocument()
    expect(screen.queryByText(/will also be cancelled/)).not.toBeInTheDocument()
  })

  it('uses the singular for one open Action', async () => {
    fetchStaffTicketMock.mockResolvedValue({ ...BASE, openActionCount: 1 })
    renderStaff()

    await userEvent.selectOptions(await control(), 'CANCELLED')

    expect(screen.getByText('Cancel this Ticket? 1 open Action will also be cancelled.')).toBeInTheDocument()
  })

  it('leaves the Ticket alone when the user keeps it, and gives the focus back to the control', async () => {
    renderStaff()
    const select = await control()
    await userEvent.selectOptions(select, 'CANCELLED')

    await userEvent.click(screen.getByRole('button', { name: 'Keep Ticket' }))

    expect(setTicketStatusMock).not.toHaveBeenCalled()
    expect(screen.queryByText('Cancel this Ticket?')).not.toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveFocus()
  })

  it('closes the question on Escape and gives the focus back', async () => {
    renderStaff()
    await userEvent.selectOptions(await control(), 'CANCELLED')
    expect(screen.getByText('Cancel this Ticket?')).toBeInTheDocument()

    await userEvent.keyboard('{Escape}')

    expect(screen.queryByText('Cancel this Ticket?')).not.toBeInTheDocument()
    expect(setTicketStatusMock).not.toHaveBeenCalled()
    expect(screen.getByRole('combobox', { name: 'Status' })).toHaveFocus()
  })
})

const EVENTS: api.TicketEvent[] = [
  { id: 'e1', type: 'OWNER_CHANGED', actor: { displayName: 'Patricia Evans' }, createdAt: '2026-10-04T01:00:00.000Z', details: { fromOwner: null, toOwner: 'Patricia Evans' } },
  { id: 'e2', type: 'STATUS_CHANGED', actor: { displayName: 'Patricia Evans' }, createdAt: '2026-10-04T01:00:00.001Z', details: { from: 'NEW', to: 'OPEN' } },
  { id: 'e3', type: 'IT_PRIORITY_CHANGED', actor: { displayName: 'Patricia Evans' }, createdAt: '2026-10-04T02:00:00.000Z', details: { from: 'MEDIUM', to: 'HIGH' } },
  { id: 'e4', type: 'ACTION_CREATED', actor: { displayName: 'Patricia Evans' }, createdAt: '2026-10-04T03:00:00.000Z', details: { actionId: 'a-1', assignee: 'Daniel Carter' } },
  { id: 'e5', type: 'ACTION_UPDATED', actor: { displayName: 'Patricia Evans' }, createdAt: '2026-10-04T03:10:00.000Z', details: { actionId: 'a-1', changedFields: ['description', 'followUpNote'] } },
  { id: 'e6', type: 'ACTION_ASSIGNED', actor: { displayName: 'Patricia Evans' }, createdAt: '2026-10-04T03:10:00.001Z', details: { actionId: 'a-1', fromAssignee: 'Daniel Carter', toAssignee: 'Olivia Reed' } },
  { id: 'e7', type: 'ACTION_STARTED', actor: { displayName: 'Olivia Reed' }, createdAt: '2026-10-04T04:00:00.000Z', details: { actionId: 'a-1' } },
  { id: 'e8', type: 'ACTION_COMPLETED', actor: { displayName: 'Olivia Reed' }, createdAt: '2026-10-04T05:00:00.000Z', details: { actionId: 'a-1' } },
  { id: 'e11', type: 'STATUS_CHANGED', actor: { displayName: 'Patricia Evans' }, createdAt: '2026-10-04T06:00:00.000Z', details: { from: 'IN_PROGRESS', to: 'CANCELLED', cascadedActionCount: 2 } },
  { id: 'e9', type: 'ACTION_CANCELLED', actor: { displayName: 'Patricia Evans' }, createdAt: '2026-10-04T06:00:00.001Z', details: { actionId: 'a-2', cascade: true } },
  { id: 'e10', type: 'ACTION_CANCELLED', actor: { displayName: 'Patricia Evans' }, createdAt: '2026-10-04T06:30:00.000Z', details: { actionId: 'a-3', cascade: false } },
]

describe('UI-19 · api-spec §1 · the history shows Bangkok time on a device in any other zone', () => {
  const deviceZone = process.env.TZ
  afterEach(() => {
    if (deviceZone === undefined) delete process.env.TZ
    else process.env.TZ = deviceZone
  })

  it.each(['UTC', 'America/Los_Angeles'])('prints 03:12 UTC as 10:12 and 18:30 UTC on the next date, on a device set to %s', async (zone) => {
    process.env.TZ = zone
    fetchHistoryMock.mockResolvedValue([
      { ...EVENTS[0], id: 'z1', createdAt: '2026-10-04T03:12:09.000Z' },
      { ...EVENTS[2], id: 'z2', createdAt: '2026-10-04T18:30:00.000Z' },
    ])
    renderStaff()

    const section = await screen.findByRole('region', { name: 'History' })
    const items = await within(section).findAllByRole('listitem')
    expect(items.map((item) => item.querySelector('time')?.textContent)).toEqual(['4 Oct 2026, 10:12', '5 Oct 2026, 01:30'])
  })
})

describe('UI-13 · AC-22 · AC-23 · the history', () => {
  it('shows every event to IT Staff as one line: time, actor and a readable description, oldest first', async () => {
    fetchHistoryMock.mockResolvedValue(EVENTS)
    renderStaff()

    const section = await screen.findByRole('region', { name: 'History' })
    const items = await within(section).findAllByRole('listitem')
    expect(items).toHaveLength(11)
    const texts = items.map((item) => item.textContent ?? '')
    expect(texts[0]).toContain('Patricia Evans')
    expect(texts[0]).toContain('Owner changed from Unassigned to Patricia Evans')
    expect(texts[1]).toContain('Status changed from New to Open')
    expect(texts[2]).toContain('IT Priority changed from Medium to High')
    expect(texts[3]).toContain('Action added and assigned to Daniel Carter')
    expect(texts[4]).toContain('Action updated: Description, Follow-up Note')
    expect(texts[5]).toContain('Action assigned from Daniel Carter to Olivia Reed')
    expect(texts[6]).toContain('Action started')
    expect(texts[7]).toContain('Action completed')
    expect(texts[8]).toContain('Status changed from In progress to Cancelled. 2 open Actions were cancelled.')
    expect(texts[9]).toContain('Action cancelled because the Ticket was cancelled')
    expect(texts[10]).toMatch(/Action cancelled$/)
    expect(within(items[0]).getByText(/^\d{1,2} \w{3} \d{4}/)).toBeInTheDocument()
    expect(within(items[0]).getByText(/^\d{1,2} \w{3} \d{4}/).tagName).toBe('TIME')
  })

  it('links each Action event to its Action, and prints no identifier', async () => {
    fetchHistoryMock.mockResolvedValue(EVENTS)
    const { container } = renderStaff()

    const link = await screen.findByRole('link', { name: /Action started/ })
    expect(link).toHaveAttribute('href', '#action-a-1')
    expect(screen.getByRole('link', { name: /Action added and assigned to Daniel Carter/ })).toHaveAttribute('href', '#action-a-1')
    const history = container.querySelector('[aria-label="History"]')!
    expect(history.textContent).not.toMatch(/\ba-[123]\b|\be\d+\b/)
    expect(within(history as HTMLElement).queryByRole('link', { name: /Status changed from New/ })).toBeNull()
  })

  it('asks for the history of this Ticket and asks again once the Ticket has changed', async () => {
    setTicketStatusMock.mockResolvedValue(SUMMARY())
    fetchStaffTicketMock.mockResolvedValueOnce(BASE).mockResolvedValue(RESOLVED)
    renderStaff()
    await waitFor(() => expect(fetchHistoryMock).toHaveBeenCalledWith('t-1'))
    const before = fetchHistoryMock.mock.calls.length

    await userEvent.selectOptions(await control(), 'RESOLVED')

    await waitFor(() => expect(fetchHistoryMock.mock.calls.length).toBeGreaterThan(before))
  })

  it('says so, plainly, when nothing has been recorded', async () => {
    renderStaff()

    expect(
      await screen.findByText('No changes have been recorded since Actions Taken were introduced.'),
    ).toBeInTheDocument()
  })

  it('says the history could not be loaded, and loads it on retry', async () => {
    fetchHistoryMock.mockRejectedValueOnce(new Error('network')).mockResolvedValue(EVENTS.slice(0, 2))
    renderStaff()

    expect(await screen.findByText('The history could not be loaded.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))

    expect(await screen.findByText(/Owner changed from Unassigned to Patricia Evans/)).toBeInTheDocument()
    expect(screen.queryByText('The history could not be loaded.')).not.toBeInTheDocument()
  })

  it('shows the Requester what the server returns for them: status changes', async () => {
    fetchHistoryMock.mockResolvedValue(EVENTS.filter((event) => event.type === 'STATUS_CHANGED'))
    render(
      <MemoryRouter initialEntries={['/tickets/t-1']}>
        <RequesterTicketDetail
          ticket={{
            id: 't-1',
            ticketNo: 'TKT-2026-000001',
            createdAt: '2026-09-01T08:00:00.000Z',
            updatedAt: '2026-09-01T08:00:00.000Z',
            summary: 'Printer queue is stuck',
            description: 'Print jobs remain queued.',
            requestedPriority: 'MEDIUM',
            itPriority: 'MEDIUM',
            status: 'CANCELLED',
            requester: { id: 'r-1', displayName: 'Jennifer Anderson', email: 'jennifer.anderson@example.ac.th' },
            category: { id: 'c-1', name: 'Hardware' },
            relatedSystem: { id: 's-1', name: 'Printer' },
            owner: null,
            attachments: [],
          }}
        />
      </MemoryRouter>,
    )

    const section = await screen.findByRole('region', { name: 'History' })
    expect(await within(section).findAllByRole('listitem')).toHaveLength(2)
    expect(section).toHaveTextContent('Status changed from New to Open')
    expect(fetchHistoryMock).toHaveBeenCalledWith('t-1')
    expect(section).not.toHaveTextContent(/Internal/)
  })
})
