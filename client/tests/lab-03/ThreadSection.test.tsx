// UI-13, UI-14. AC-17, AC-37; ui-spec §9.
//
// The one thing on this screen that can cause real harm is posting an internal
// remark publicly, so these tests are about telling the two apart.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as api from '../../src/api.js'
import {
  InternalNotesSection,
  PublicCommentsSection,
} from '../../src/components/ThreadSection.js'

vi.mock('../../src/api.js', async () => {
  const actual = await vi.importActual<typeof import('../../src/api.js')>(
    '../../src/api.js',
  )
  return {
    ...actual,
    fetchComments: vi.fn(),
    postComment: vi.fn(),
    fetchInternalNotes: vi.fn(),
    postInternalNote: vi.fn(),
  }
})

const fetchCommentsMock = vi.mocked(api.fetchComments)
const postCommentMock = vi.mocked(api.postComment)
const fetchInternalNotesMock = vi.mocked(api.fetchInternalNotes)
const postInternalNoteMock = vi.mocked(api.postInternalNote)

const COMMENT: api.ThreadEntry = {
  id: 'c-1',
  body: 'I restarted the laptop and the problem persists.',
  createdAt: '2026-09-08T04:12:09.000Z',
  author: { id: 'r-1', displayName: 'Jennifer Anderson', role: 'REQUESTER' },
}

const NOTE: api.ThreadEntry = {
  id: 'n-1',
  body: 'Vendor escalation reference ZX-4471.',
  createdAt: '2026-09-08T05:00:00.000Z',
  author: { id: 's-1', displayName: 'Patricia Evans', role: 'IT_STAFF' },
}

beforeEach(() => {
  vi.clearAllMocks()
  fetchCommentsMock.mockResolvedValue([COMMENT])
  fetchInternalNotesMock.mockResolvedValue([NOTE])
})

describe('UI-13 · AC-37 · the two sections are told apart at a glance', () => {
  it('heads each one with who can see it', async () => {
    render(
      <>
        <PublicCommentsSection ticketId="t-1" />
        <InternalNotesSection ticketId="t-1" />
      </>,
    )

    expect(
      await screen.findByRole('heading', { name: 'Public Comments' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/visible to the requester/i)).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: 'Internal Notes' })).toBeInTheDocument()
    expect(screen.getByText(/it staff and administrator only/i)).toBeInTheDocument()
  })

  it('gives each its own composer, labelled at the point of writing', async () => {
    render(
      <>
        <PublicCommentsSection ticketId="t-1" />
        <InternalNotesSection ticketId="t-1" />
      </>,
    )

    expect(
      await screen.findByRole('button', { name: 'Post Comment' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Add Internal Note' }),
    ).toBeInTheDocument()
  })

  it('never presents them as tabs of one control', async () => {
    render(
      <>
        <PublicCommentsSection ticketId="t-1" />
        <InternalNotesSection ticketId="t-1" />
      </>,
    )
    await screen.findByRole('heading', { name: 'Public Comments' })

    // Tabs make the two look like one thing in two modes, and the whole risk
    // is a person believing they are in the mode they are not (ui-spec §9).
    expect(screen.queryByRole('tablist')).not.toBeInTheDocument()
    expect(screen.queryAllByRole('tab')).toHaveLength(0)
  })

  it('marks every internal entry as internal, and no public one', async () => {
    render(
      <>
        <PublicCommentsSection ticketId="t-1" />
        <InternalNotesSection ticketId="t-1" />
      </>,
    )

    const notes = await screen.findByRole('region', { name: 'Internal Notes' })
    expect(within(notes).getByText('Internal')).toBeInTheDocument()

    const publicThread = screen.getByRole('region', { name: 'Public Comments' })
    expect(within(publicThread).queryByText('Internal')).toBeNull()
  })

  it('puts the internal section on its own surface', async () => {
    render(<InternalNotesSection ticketId="t-1" />)

    const notes = await screen.findByRole('region', { name: 'Internal Notes' })
    expect(notes).toHaveClass('thread--internal')
  })
})

describe('UI-13 · BR-30 · entries carry their author and role', () => {
  it('shows the author name and a role badge on each entry', async () => {
    render(<PublicCommentsSection ticketId="t-1" />)

    expect(await screen.findByText('Jennifer Anderson')).toBeInTheDocument()
    expect(screen.getByText('REQUESTER')).toBeInTheDocument()
    expect(screen.getByText(COMMENT.body)).toBeInTheDocument()
  })

  it('renders content as text, never as markup (SEC-029)', async () => {
    fetchCommentsMock.mockResolvedValue([
      { ...COMMENT, body: '<script>alert(1)</script><b>bold</b>' },
    ])
    render(<PublicCommentsSection ticketId="t-1" />)

    const entry = await screen.findByText('<script>alert(1)</script><b>bold</b>')
    expect(entry.querySelector('script')).toBeNull()
    expect(entry.querySelector('b')).toBeNull()
  })
})

describe('UI-13 · posting', () => {
  it('posts a comment and adds it to the thread', async () => {
    postCommentMock.mockResolvedValue({
      ...COMMENT,
      id: 'c-2',
      body: 'Thanks for the update.',
    })
    render(<PublicCommentsSection ticketId="t-1" />)

    await userEvent.type(
      await screen.findByLabelText('Add a comment'),
      'Thanks for the update.',
    )
    await userEvent.click(screen.getByRole('button', { name: 'Post Comment' }))

    await waitFor(() => {
      expect(postCommentMock).toHaveBeenCalledWith('t-1', 'Thanks for the update.')
    })
    expect(await screen.findByText('Thanks for the update.')).toBeInTheDocument()
  })

  it('posts a note through the note endpoint, never the comment one', async () => {
    postInternalNoteMock.mockResolvedValue({ ...NOTE, id: 'n-2', body: 'Escalated.' })
    render(<InternalNotesSection ticketId="t-1" />)

    await userEvent.type(await screen.findByLabelText('Add an internal note'), 'Escalated.')
    await userEvent.click(screen.getByRole('button', { name: 'Add Internal Note' }))

    await waitFor(() => {
      expect(postInternalNoteMock).toHaveBeenCalledWith('t-1', 'Escalated.')
    })
    expect(postCommentMock).not.toHaveBeenCalled()
  })

  it('refuses empty and whitespace-only content without calling the API', async () => {
    render(<PublicCommentsSection ticketId="t-1" />)
    await screen.findByRole('button', { name: 'Post Comment' })

    await userEvent.click(screen.getByRole('button', { name: 'Post Comment' }))
    expect(postCommentMock).not.toHaveBeenCalled()

    await userEvent.type(screen.getByLabelText('Add a comment'), '   ')
    await userEvent.click(screen.getByRole('button', { name: 'Post Comment' }))
    expect(postCommentMock).not.toHaveBeenCalled()
  })

  it('clears the composer after a successful post, and not after a failure', async () => {
    postCommentMock.mockResolvedValueOnce({ ...COMMENT, id: 'c-2', body: 'Saved.' })
    render(<PublicCommentsSection ticketId="t-1" />)

    const box = await screen.findByLabelText('Add a comment')
    await userEvent.type(box, 'Saved.')
    await userEvent.click(screen.getByRole('button', { name: 'Post Comment' }))
    await waitFor(() => expect(box).toHaveValue(''))

    postCommentMock.mockRejectedValueOnce(new Error('network'))
    await userEvent.type(box, 'Not saved.')
    await userEvent.click(screen.getByRole('button', { name: 'Post Comment' }))

    // Losing what someone typed because the network failed is its own defect.
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(box).toHaveValue('Not saved.')
  })
})

describe('UI-14 · AC-25 · the Requester sees no Internal Notes affordance', () => {
  it('renders nothing at all when the notes are refused', async () => {
    fetchInternalNotesMock.mockRejectedValue(
      new api.ApiRequestError('Internal notes request failed', [], 403, 'FORBIDDEN'),
    )
    render(<InternalNotesSection ticketId="t-1" />)

    await waitFor(() => {
      expect(fetchInternalNotesMock).toHaveBeenCalled()
    })

    // Not a disabled section and not an explanation: a Requester should not
    // learn that Internal Notes exist at all (ui-spec §9).
    expect(screen.queryByRole('region', { name: 'Internal Notes' })).toBeNull()
    expect(screen.queryByText(/internal/i)).toBeNull()
    expect(screen.queryByRole('button', { name: 'Add Internal Note' })).toBeNull()
  })
})
