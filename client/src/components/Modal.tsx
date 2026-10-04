// A modal dialog that follows Lab 3's rules and adds the ones it lacked (lab-04 ui-spec §5, §9): it is labelled,
// moves the focus inside, keeps Tab and Shift+Tab inside, closes on Escape and gives the focus back.
import { useEffect, useId, useRef, type ReactNode } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

const focusablesIn = (root: HTMLElement | null): HTMLElement[] => Array.from(root?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const titleId = useId()
  const dialog = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    focusablesIn(dialog.current)[0]?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const items = focusablesIn(dialog.current)
      // Every control is disabled while a save is in flight (AC-35): the dialog itself keeps the focus.
      if (items.length === 0) {
        event.preventDefault()
        dialog.current?.focus()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      const inside = dialog.current?.contains(active) ?? false
      if (event.shiftKey && (active === first || active === dialog.current || !inside)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (active === last || !inside)) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (opener && document.contains(opener)) opener.focus()
    }
  }, [])

  // The control that was just pressed can be disabled by the save it started, so the dialog takes the focus over.
  useEffect(() => {
    const node = dialog.current
    if (node && focusablesIn(node).length === 0 && document.activeElement !== node) node.focus()
  })

  return (
    <div className="zen-modal" role="presentation">
      <div ref={dialog} className="zen-modal__dialog zen-card" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </div>
  )
}
