// UI-19/UI-20/UI-21/UI-22 · AC-29/AC-30/AC-32/AC-33 · BR-28/BR-32/BR-33.
// TDT-02 covers the five-active boundary; TDT-03 covers attachment state and
// requested-action combinations; TDT-04 covers the active-to-removed flow.
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AttachmentSection } from '../../src/components/AttachmentSection.js'

type AttachmentFixture = {
  id: string
  originalFilename: string
  mimeType: string
  sizeBytes: number
  createdAt: string
  removedAt: string | null
  removedReason: string | null
  isDownloadable: boolean
}

const ACTIVE: AttachmentFixture = {
  id: 'attachment-active',
  originalFilename: 'screen.png',
  mimeType: 'image/png',
  sizeBytes: 2048,
  createdAt: '2026-09-01T08:00:00.000Z',
  removedAt: null,
  removedReason: null,
  isDownloadable: true,
}

const REMOVED: AttachmentFixture = {
  id: 'attachment-removed',
  originalFilename: 'old-screen.png',
  mimeType: 'image/png',
  sizeBytes: 1024,
  createdAt: '2026-09-01T08:00:00.000Z',
  removedAt: '2026-09-01T09:00:00.000Z',
  removedReason: 'Uploaded the wrong file',
  isDownloadable: false,
}

function renderSection(
  overrides: Partial<{
    attachments: AttachmentFixture[]
    activeCount: number
    activeLimit: number
  }> = {},
) {
  return render(
    <AttachmentSection
      ticketId="ticket-1"
      requesterId="r-jennifer"
      attachments={overrides.attachments ?? [ACTIVE]}
      activeCount={overrides.activeCount ?? 1}
      activeLimit={overrides.activeLimit ?? 5}
      onAdd={vi.fn(async (file: File) => ({ ...ACTIVE, originalFilename: file.name }))}
      onRemove={vi.fn(async () => REMOVED)}
      onDownload={vi.fn(async () => {})}
    />,
  )
}

describe('UI-19 · AC-29 · attachment upload state', () => {
  it('shows Add Attachment, accepts a file, and renders the active row after upload', async () => {
    const user = userEvent.setup()
    renderSection({ attachments: [], activeCount: 0 })

    expect(screen.queryByRole('button', { name: 'Add Attachment' })).toBeInTheDocument()
    const input = screen.queryByLabelText('Attachment file')
    expect(input).toBeInTheDocument()

    await user.upload(
      input as HTMLInputElement,
      new File(['new image'], 'new-image.png', { type: 'image/png' }),
    )

    expect(await screen.findByText('new-image.png')).toBeInTheDocument()
  })
})

describe('UI-20 · AC-32/AC-33 · removed attachment presentation', () => {
  it('shows metadata and removal reason without a download link', () => {
    renderSection({ attachments: [REMOVED], activeCount: 0 })

    expect(screen.queryByText(REMOVED.originalFilename)).toBeInTheDocument()
    expect(screen.queryByText('Removed')).toBeInTheDocument()
    expect(screen.queryByText(REMOVED.removedReason!)).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: REMOVED.originalFilename }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: new RegExp(`download.*${REMOVED.originalFilename}`, 'i') }),
    ).not.toBeInTheDocument()
  })
})

describe('UI-21 · BR-32 · removal confirmation', () => {
  it('requires a reason and lets Cancel close without sending a removal request', async () => {
    const user = userEvent.setup()
    const onRemove = vi.fn(async () => REMOVED)
    render(
      <AttachmentSection
        ticketId="ticket-1"
        requesterId="r-jennifer"
        attachments={[ACTIVE]}
        activeCount={1}
        activeLimit={5}
        onAdd={vi.fn(async () => ACTIVE)}
        onRemove={onRemove}
        onDownload={vi.fn(async () => {})}
      />,
    )

    expect(screen.queryByRole('button', { name: /remove.*screen\.png/i })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /remove.*screen\.png/i }))
    expect(screen.queryByRole('dialog')).toBeInTheDocument()
    expect(screen.queryByLabelText('Removal reason')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remove' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onRemove).not.toHaveBeenCalled()
  })
})

describe('UI-22 · AC-30 · BR-28 · active attachment limit', () => {
  it('disables Add Attachment and explains the five-active limit', () => {
    renderSection({ attachments: [ACTIVE], activeCount: 5 })

    const add = screen.queryByRole('button', { name: 'Add Attachment' })
    expect(add).toBeInTheDocument()
    expect(add).toBeDisabled()
    expect(add).toHaveAttribute('title', expect.stringMatching(/five active attachments/i))
  })
})
