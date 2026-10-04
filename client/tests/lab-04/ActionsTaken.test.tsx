// UI-01 to UI-10, STYLE-02 to STYLE-05 · lab-04 AC-03, AC-07 to AC-10, AC-12 to AC-14, AC-35, AC-36; ui-spec §5.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as api from '../../src/api.js'
import { ActionStatusBadge } from '../../src/components/Badge.js'
import { ActionsTakenSection } from '../../src/components/ActionsTakenSection.js'

vi.mock('../../src/api.js', async () => {
  const actual = await vi.importActual<typeof import('../../src/api.js')>('../../src/api.js')
  return { ...actual, fetchActions: vi.fn(), createAction: vi.fn(), updateAction: vi.fn(), moveAction: vi.fn() }
})

const fetchActionsMock = vi.mocked(api.fetchActions)
const createActionMock = vi.mocked(api.createAction)
const updateActionMock = vi.mocked(api.updateAction)
const moveActionMock = vi.mocked(api.moveAction)

const OWNERS = [
  { id: 's-1', displayName: 'Patricia Evans' },
  { id: 's-2', displayName: 'Daniel Carter' },
  { id: 's-3', displayName: 'Olivia Reed' },
]

const action = (over: Partial<api.ActionTaken> = {}): api.ActionTaken => ({
  id: 'a-1',
  ticketId: 't-1',
  status: 'PLANNED',
  description: 'Collect the relay error from the mail gateway log.',
  result: null,
  followUpRequired: false,
  followUpNote: null,
  attachmentNotes: null,
  assignee: { id: 's-2', displayName: 'Daniel Carter', isActive: true },
  performedBy: { id: 's-1', displayName: 'Patricia Evans' },
  actionAt: '2026-10-04T03:12:09.000Z',
  completedBy: null,
  completedAt: null,
  cancelledBy: null,
  cancelledAt: null,
  cancellationReason: null,
  version: 1,
  updatedAt: '2026-10-04T03:12:09.000Z',
  ...over,
})

const PLANNED = action()
const STARTED = action({ id: 'a-2', status: 'IN_PROGRESS', description: 'Restore the allow-list.', actionAt: '2026-10-04T04:00:00.000Z', version: 2 })
const DONE = action({
  id: 'a-3',
  status: 'COMPLETED',
  description: 'Verify delivery.',
  result: 'Mail delivered.',
  completedBy: { id: 's-3', displayName: 'Olivia Reed' },
  completedAt: '2026-10-04T05:00:00.000Z',
  actionAt: '2026-10-04T04:30:00.000Z',
  version: 3,
})
const CANCELLED = action({
  id: 'a-4',
  status: 'CANCELLED',
  description: 'Call the vendor.',
  cancelledBy: { id: 's-1', displayName: 'Patricia Evans' },
  cancelledAt: '2026-10-04T06:00:00.000Z',
  cancellationReason: 'The vendor was reached by email instead.',
  actionAt: '2026-10-04T05:30:00.000Z',
  version: 2,
})

function renderStaff(over: Partial<Parameters<typeof ActionsTakenSection>[0]> = {}) {
  const onChanged = vi.fn()
  const view = render(
    <ActionsTakenSection
      ticketId="t-1"
      ticketStatus="IN_PROGRESS"
      audience="staff"
      assignableOwners={OWNERS}
      currentUserId="s-1"
      onChanged={onChanged}
      {...over}
    />,
  )
  return { ...view, onChanged }
}

beforeEach(() => {
  vi.clearAllMocks()
  fetchActionsMock.mockResolvedValue([PLANNED, STARTED, DONE])
})

const openForm = async () => {
  await userEvent.click(await screen.findByRole('button', { name: 'Add Action' }))
  return screen.findByLabelText(/^Description/)
}

describe('UI-01 · AC-03 · the list', () => {
  it('shows the count, every field in creation order, the inactive marker and one View button per row', async () => {
    fetchActionsMock.mockResolvedValue([
      PLANNED,
      action({ ...STARTED, assignee: { id: 's-9', displayName: 'Thomas Reed', isActive: false } }),
      DONE,
    ])
    renderStaff()

    expect(await screen.findByRole('heading', { name: 'Actions Taken (3)' })).toBeInTheDocument()
    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Date/Time', 'Description', 'Assignee', 'Performed by', 'Status', 'Follow-up', '',
    ])
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(3)
    expect(rows[0]).toHaveTextContent('Collect the relay error')
    expect(rows[1]).toHaveTextContent('Restore the allow-list.')
    expect(rows[2]).toHaveTextContent('Verify delivery.')
    expect(rows[1]).toHaveTextContent('Thomas Reed (inactive)')
    expect(screen.getAllByText(/\(inactive\)/)).toHaveLength(1)
    expect(rows[0]).toHaveTextContent('Patricia Evans')
    expect(rows[0].id).toBe('action-a-1')
    expect(within(rows[0]).getByRole('button', { name: /^View .*4 Oct 2026/ })).toBeInTheDocument()
  })

  it('labels every cell so the table becomes labelled cards below 992 px', async () => {
    renderStaff()
    await screen.findByRole('table')

    const cells = Array.from(document.querySelectorAll('tbody tr:first-child td'))
    expect(cells.map((cell) => cell.getAttribute('data-label'))).toEqual([
      'Date/Time', 'Description', 'Assignee', 'Performed by', 'Status', 'Follow-up', null,
    ])
  })

  it('is the anchor target the Ticket links to, and says what the Requester can see', async () => {
    const { container } = renderStaff()
    await screen.findByRole('table')

    expect(container.querySelector('section#actions-taken')).not.toBeNull()
    expect(screen.getByText('Actions are visible to the Requester. Use Internal Notes for private information.')).toBeInTheDocument()
  })

  it('says so when there are none, and when loading fails it offers to try again', async () => {
    fetchActionsMock.mockResolvedValueOnce([])
    const { unmount } = renderStaff()
    expect(await screen.findByText('No Actions have been recorded yet.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Actions Taken (0)' })).toBeInTheDocument()
    unmount()

    fetchActionsMock.mockRejectedValueOnce(new Error('network')).mockResolvedValue([PLANNED])
    renderStaff()
    expect(await screen.findByText('The Actions could not be loaded.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('Collect the relay error from the mail gateway log.')).toBeInTheDocument()
  })
})

describe('STYLE-02 · STY-018 · STY-019 · Action status badges carry their text', () => {
  it('prints a label for each of the four values', () => {
    const labels = (['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] as const).map((value) => {
      const { unmount, container } = render(<ActionStatusBadge value={value} />)
      const text = container.textContent
      unmount()
      return text
    })
    expect(labels).toEqual(['Planned', 'In progress', 'Completed', 'Cancelled'])
  })

  it('is the badge the list uses', async () => {
    renderStaff()
    const table = await screen.findByRole('table')
    expect(within(table).getByText('Planned')).toHaveClass('zen-badge')
    expect(within(table).getByText('In progress')).toHaveClass('zen-badge')
    expect(within(table).getByText('Completed')).toHaveClass('zen-badge')
  })
})

describe('UI-02 · AC-10 · BR-13 to BR-15 · create mode checks before it sends', () => {
  it('opens at the top with the focus on Description, and shows the system fields as text', async () => {
    renderStaff()
    const description = await openForm()

    expect(description).toHaveFocus()
    expect(screen.getByText('Recorded automatically when you save')).toBeInTheDocument()
    // STYLE-05 · STY-009 · STY-010
    expect(screen.queryByRole('textbox', { name: /Performed by|Action Date/ })).not.toBeInTheDocument()
    expect(screen.getByText('Performed by')).toBeInTheDocument()
  })

  it('refuses an empty or over-long Description, without calling the API', async () => {
    renderStaff()
    const description = await openForm()

    await userEvent.click(screen.getByRole('button', { name: 'Save Action' }))
    expect(await screen.findByText('Enter a description.')).toBeInTheDocument()
    expect(createActionMock).not.toHaveBeenCalled()

    await userEvent.click(description)
    await userEvent.paste('x'.repeat(2001))
    await userEvent.click(screen.getByRole('button', { name: 'Save Action' }))
    expect(await screen.findByText('Keep the description to 2000 characters or fewer.')).toBeInTheDocument()
    expect(screen.getByText('2001 / 2000')).toBeInTheDocument()
    expect(createActionMock).not.toHaveBeenCalled()
  })

  it('reveals the Follow-up Note when ticked, requires it, and clears it when unticked', async () => {
    renderStaff()
    const description = await openForm()
    await userEvent.type(description, 'Check the relay')
    expect(screen.queryByLabelText(/^Follow-up Note/)).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('checkbox', { name: 'Follow-Up Required?' }))
    const note = await screen.findByLabelText(/^Follow-up Note/)
    await userEvent.click(screen.getByRole('button', { name: 'Save Action' }))
    expect(await screen.findByText('Enter the follow-up note.')).toBeInTheDocument()
    expect(createActionMock).not.toHaveBeenCalled()

    await userEvent.type(note, 'Ask the vendor')
    await userEvent.click(screen.getByRole('checkbox', { name: 'Follow-Up Required?' }))
    expect(screen.queryByLabelText(/^Follow-up Note/)).not.toBeInTheDocument()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Follow-Up Required?' }))
    expect(await screen.findByLabelText(/^Follow-up Note/)).toHaveValue('')
  })

  it('refuses Attachment Notes longer than 500 characters', async () => {
    renderStaff()
    await userEvent.type(await openForm(), 'Check the relay')
    await userEvent.click(screen.getByLabelText('Attachment Notes'))
    await userEvent.paste('n'.repeat(501))
    await userEvent.click(screen.getByRole('button', { name: 'Save Action' }))

    expect(await screen.findByText('Keep the attachment notes to 500 characters or fewer.')).toBeInTheDocument()
    expect(createActionMock).not.toHaveBeenCalled()
  })

  it('sends a trimmed Description, a null note when not required, a null blank note field, and a request id', async () => {
    createActionMock.mockResolvedValue(action({ id: 'a-9' }))
    const { onChanged } = renderStaff()
    await userEvent.type(await openForm(), '  Check the relay  ')
    await userEvent.click(screen.getByRole('button', { name: 'Save Action' }))

    await waitFor(() => expect(createActionMock).toHaveBeenCalledTimes(1))
    const [ticketId, body] = createActionMock.mock.calls[0]
    expect(ticketId).toBe('t-1')
    expect(body).toMatchObject({
      description: 'Check the relay',
      assigneeId: 's-1',
      followUpRequired: false,
      followUpNote: null,
      attachmentNotes: null,
    })
    expect(body.requestId).toMatch(/^[0-9a-f-]{36}$/)
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
    expect(screen.queryByRole('button', { name: 'Save Action' })).not.toBeInTheDocument()
  })
})

describe('UI-03 · BR-06 · BR-07 · the assignee control', () => {
  it('defaults to the current user and offers the assignable owners only', async () => {
    renderStaff()
    await openForm()

    const select = screen.getByLabelText(/^Assignee/)
    expect(select).toHaveValue('s-1')
    expect(within(select).getAllByRole('option').map((o) => (o as HTMLOptionElement).value)).toEqual(['s-1', 's-2', 's-3'])
  })

  it('shows an ineligible assignee under the field and asks for the list again', async () => {
    createActionMock.mockRejectedValue(new api.ApiRequestError('An Action must be assigned to an active IT Staff or Administrator user.', [], 400, 'ASSIGNEE_NOT_ELIGIBLE'))
    const { onChanged } = renderStaff()
    await userEvent.type(await openForm(), 'Check the relay')
    await userEvent.click(screen.getByRole('button', { name: 'Save Action' }))

    expect(await screen.findByText('Choose an active IT Staff member or Administrator.')).toBeInTheDocument()
    expect(onChanged).toHaveBeenCalled()
    expect(screen.getByLabelText(/^Description/)).toHaveValue('Check the relay')
  })
})

describe('UI-04 · AC-07 · completing needs a Result', () => {
  it('shows the message under Result, moves the focus there and sends nothing', async () => {
    renderStaff()
    await userEvent.click((await screen.findAllByRole('button', { name: /^View / }))[1])

    await userEvent.click(await screen.findByRole('button', { name: 'Complete' }))

    expect(await screen.findByText('Enter the result before completing this Action.')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Result/)).toHaveFocus()
    expect(moveActionMock).not.toHaveBeenCalled()
  })

  it('completes with the Result typed, the version it holds and nothing else', async () => {
    moveActionMock.mockResolvedValue(action({ ...STARTED, status: 'COMPLETED', version: 3 }))
    const { onChanged } = renderStaff()
    await userEvent.click((await screen.findAllByRole('button', { name: /^View / }))[1])
    await userEvent.type(await screen.findByLabelText(/^Result/), 'Allow-list restored')
    await userEvent.click(screen.getByRole('button', { name: 'Complete' }))

    await waitFor(() => expect(moveActionMock).toHaveBeenCalledWith('t-1', 'a-2', { expectedVersion: 2, status: 'COMPLETED', result: 'Allow-list restored' }))
    await waitFor(() => expect(onChanged).toHaveBeenCalled())
  })

  it('starts a Planned Action and offers no Complete before it', async () => {
    moveActionMock.mockResolvedValue(action({ status: 'IN_PROGRESS', version: 2 }))
    renderStaff()
    await userEvent.click((await screen.findAllByRole('button', { name: /^View / }))[0])

    expect(screen.queryByRole('button', { name: 'Complete' })).not.toBeInTheDocument()
    await userEvent.click(await screen.findByRole('button', { name: 'Start' }))
    await waitFor(() => expect(moveActionMock).toHaveBeenCalledWith('t-1', 'a-1', { expectedVersion: 1, status: 'IN_PROGRESS' }))
  })
})

describe('UI-05 · AC-08 · AC-35 · the cancel dialog', () => {
  async function openDialog() {
    renderStaff()
    await userEvent.click((await screen.findAllByRole('button', { name: /^View / }))[0])
    const trigger = await screen.findByRole('button', { name: 'Cancel Action' })
    await userEvent.click(trigger)
    return { trigger, dialog: await screen.findByRole('dialog') }
  }

  it('is labelled, asks for a reason, and sends nothing without one', async () => {
    const { dialog } = await openDialog()

    expect(dialog).toHaveAccessibleName(/Cancel this Action/)
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel Action' }))
    expect(await within(dialog).findByText('Enter the reason for cancelling.')).toBeInTheDocument()
    expect(moveActionMock).not.toHaveBeenCalled()
  })

  it('keeps the focus inside while open, and closes on Escape with the focus back on its trigger', async () => {
    const { trigger, dialog } = await openDialog()
    expect(dialog.contains(document.activeElement)).toBe(true)

    for (let i = 0; i < 6; i += 1) {
      await userEvent.tab()
      expect(dialog.contains(document.activeElement), `after ${i + 1} tabs`).toBe(true)
    }
    for (let i = 0; i < 6; i += 1) {
      await userEvent.tab({ shift: true })
      expect(dialog.contains(document.activeElement)).toBe(true)
    }

    await userEvent.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
    expect(moveActionMock).not.toHaveBeenCalled()
  })

  it('keeps the Action when asked, and cancels it with the reason when confirmed', async () => {
    moveActionMock.mockResolvedValue(action({ status: 'CANCELLED', version: 2 }))
    const { dialog } = await openDialog()
    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep Action' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel Action' }))
    const again = await screen.findByRole('dialog')
    await userEvent.type(within(again).getByLabelText(/^Reason/), 'No longer needed')
    await userEvent.click(within(again).getByRole('button', { name: 'Cancel Action' }))

    await waitFor(() => expect(moveActionMock).toHaveBeenCalledWith('t-1', 'a-1', { expectedVersion: 1, status: 'CANCELLED', cancellationReason: 'No longer needed' }))
  })
})

describe('UI-06 · AC-09 · a finished Action is read-only', () => {
  it('shows who finished it and the Result, with no Edit or status button', async () => {
    fetchActionsMock.mockResolvedValue([DONE, CANCELLED])
    renderStaff()
    await userEvent.click((await screen.findAllByRole('button', { name: /^View / }))[0])

    const panel = await screen.findByRole('region', { name: /Action details/ })
    expect(panel).toHaveTextContent('Mail delivered.')
    expect(panel).toHaveTextContent('Olivia Reed')
    for (const name of ['Edit', 'Start', 'Complete', 'Cancel Action']) {
      expect(within(panel).queryByRole('button', { name })).not.toBeInTheDocument()
    }
    expect(within(panel).queryAllByRole('textbox')).toHaveLength(0)

    await userEvent.click(screen.getAllByRole('button', { name: /^View / })[1])
    expect(await screen.findByText('The vendor was reached by email instead.')).toBeInTheDocument()
  })
})

describe('UI-07 · AC-13 · a Ticket that is not workable', () => {
  it('replaces Add Action with the banner and offers no edit control', async () => {
    renderStaff({ ticketStatus: 'RESOLVED' })

    expect(await screen.findByText('This Ticket is Resolved. Actions are read-only — reopen the Ticket to record more work.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add Action' })).not.toBeInTheDocument()
    await userEvent.click((await screen.findAllByRole('button', { name: /^View / }))[1])
    for (const name of ['Edit', 'Start', 'Complete', 'Cancel Action']) {
      expect(screen.queryByRole('button', { name })).not.toBeInTheDocument()
    }
  })

  it('offers Add Action on every working status (positive control)', async () => {
    for (const status of ['NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED'] as const) {
      const { unmount } = renderStaff({ ticketStatus: status })
      expect(await screen.findByRole('button', { name: 'Add Action' }), status).toBeInTheDocument()
      unmount()
    }
  })
})

describe('UI-08 · AC-12 · BR-17 · the Requester sees it read-only, by name', () => {
  const requesterView = (a: api.ActionTaken): api.ActionTaken => ({
    ...a,
    assignee: { displayName: a.assignee.displayName },
    performedBy: { displayName: a.performedBy!.displayName },
    completedBy: a.completedBy ? { displayName: a.completedBy.displayName } : null,
    cancelledBy: null,
  })

  it('has no controls, no hint and no identifiers, and no inactive marker', async () => {
    fetchActionsMock.mockResolvedValue([requesterView(PLANNED), requesterView(DONE)])
    const { container } = render(<ActionsTakenSection ticketId="t-1" ticketStatus="IN_PROGRESS" audience="requester" />)

    expect(await screen.findByRole('heading', { name: 'Actions Taken (2)' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add Action' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Internal Notes/)).not.toBeInTheDocument()
    await userEvent.click(screen.getAllByRole('button', { name: /^View / })[1])
    const panel = await screen.findByRole('region', { name: /Action details/ })
    for (const name of ['Edit', 'Start', 'Complete', 'Cancel Action']) {
      expect(within(panel).queryByRole('button', { name })).not.toBeInTheDocument()
    }
    expect(panel).toHaveTextContent('Olivia Reed')
    expect(container.innerHTML).not.toMatch(/s-[0-9]|isActive|\(inactive\)/)
  })

  it('shows no banner either when the Ticket is resolved', async () => {
    fetchActionsMock.mockResolvedValue([requesterView(DONE)])
    render(<ActionsTakenSection ticketId="t-1" ticketStatus="RESOLVED" audience="requester" />)

    await screen.findByRole('table')
    expect(screen.queryByText(/read-only — reopen/)).not.toBeInTheDocument()
  })
})

describe('UI-09 · FR-24 · AC-14 · one submission, one request', () => {
  it('disables Save while in flight, sends once for a burst of clicks, and reuses the request id on retry', async () => {
    let fail: (reason: unknown) => void = () => {}
    createActionMock.mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject }))
    renderStaff()
    await userEvent.type(await openForm(), 'Check the relay')
    const save = screen.getByRole('button', { name: 'Save Action' })

    await userEvent.dblClick(save)
    expect(createActionMock).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: /Working|Saving/ })).toBeDisabled()

    fail(new Error('network down'))
    expect(await screen.findByText('The Action could not be saved. Your entries are kept.')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Description/)).toHaveValue('Check the relay')

    createActionMock.mockResolvedValue(action({ id: 'a-9' }))
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    await waitFor(() => expect(createActionMock).toHaveBeenCalledTimes(2))
    expect(createActionMock.mock.calls[1][1].requestId).toBe(createActionMock.mock.calls[0][1].requestId)
  })

  it('uses a new request id for a new form', async () => {
    createActionMock.mockResolvedValue(action({ id: 'a-9' }))
    renderStaff()
    await userEvent.type(await openForm(), 'First')
    await userEvent.click(screen.getByRole('button', { name: 'Save Action' }))
    await waitFor(() => expect(createActionMock).toHaveBeenCalledTimes(1))
    await userEvent.type(await openForm(), 'Second')
    await userEvent.click(screen.getByRole('button', { name: 'Save Action' }))
    await waitFor(() => expect(createActionMock).toHaveBeenCalledTimes(2))

    expect(createActionMock.mock.calls[1][1].requestId).not.toBe(createActionMock.mock.calls[0][1].requestId)
  })
})

describe('UI-10 · AC-36 · a conflict or a failure keeps what was typed', () => {
  async function startEditing() {
    renderStaff()
    await userEvent.click((await screen.findAllByRole('button', { name: /^View / }))[0])
    await userEvent.click(await screen.findByRole('button', { name: 'Edit' }))
    const description = await screen.findByLabelText(/^Description/)
    await userEvent.clear(description)
    await userEvent.type(description, 'My new wording')
    return description
  }

  it('shows the conflict, keeps the entries, and saves against the latest version on the next try', async () => {
    updateActionMock
      .mockRejectedValueOnce(new api.ApiRequestError('This Action was changed by someone else.', [], 409, 'STALE_VERSION', { currentVersion: 3 }))
      .mockResolvedValue(action({ description: 'My new wording', version: 4 }))
    const description = await startEditing()
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Someone else changed this Action. The latest version is shown; your unsaved entries are kept in the form.')).toBeInTheDocument()
    expect(description).toHaveValue('My new wording')

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(updateActionMock).toHaveBeenCalledTimes(2))
    expect(updateActionMock.mock.calls[0][2]).toMatchObject({ expectedVersion: 1, description: 'My new wording' })
    expect(updateActionMock.mock.calls[1][2]).toMatchObject({ expectedVersion: 3, description: 'My new wording' })
  })

  it('keeps the entries after a save failure, and offers Try again', async () => {
    updateActionMock.mockRejectedValue(new Error('network'))
    const description = await startEditing()
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('The Action could not be saved. Your entries are kept.')).toBeInTheDocument()
    expect(description).toHaveValue('My new wording')
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('says a finished Action is final, and shows it read-only after a reload', async () => {
    updateActionMock.mockRejectedValue(new api.ApiRequestError('This Action is already completed or cancelled.', [], 409, 'ACTION_TERMINAL'))
    await startEditing()
    fetchActionsMock.mockResolvedValue([action({ status: 'COMPLETED', result: 'Done', version: 2 }), STARTED, DONE])
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('This Action is already completed or cancelled.')).toBeInTheDocument()
    await waitFor(() => expect(fetchActionsMock).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument())
  })
})

describe('STYLE-03 · STYLE-04 · STY-012 · STY-026 · labels and messages', () => {
  it('gives every input in the form and the panel a label', async () => {
    const { container } = renderStaff()
    await openForm()
    await userEvent.click(screen.getByRole('checkbox', { name: 'Follow-Up Required?' }))
    const fields = Array.from(container.querySelectorAll('input, textarea, select'))
    expect(fields.length).toBeGreaterThanOrEqual(5)
    for (const field of fields) {
      const named = (field as HTMLInputElement).labels?.length || field.getAttribute('aria-label')
      expect(named, field.outerHTML.slice(0, 80)).toBeTruthy()
    }
  })

  it('puts a validation message below its field and links it to the control', async () => {
    renderStaff()
    const description = await openForm()
    await userEvent.click(screen.getByRole('button', { name: 'Save Action' }))

    const message = await screen.findByText('Enter a description.')
    expect(description).toHaveAttribute('aria-invalid', 'true')
    expect(description.getAttribute('aria-describedby')).toContain(message.id)
    expect(description.compareDocumentPosition(message) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
