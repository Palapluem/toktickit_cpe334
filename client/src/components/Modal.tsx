// A modal dialog that follows Lab 3's rules and adds the ones it lacked (lab-04 ui-spec §5, §9): it is labelled,
// moves the focus inside, keeps Tab and Shift+Tab inside, closes on Escape and gives the focus back.
import { useEffect, useId, useRef, type ReactNode } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const titleId = useId()
  const dialog = useRef<HTMLDivElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null
    const focusables = () => Array.from(dialog.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
    focusables()[0]?.focus()

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      const inside = dialog.current?.contains(document.activeElement) ?? false
      if (event.shiftKey && (document.activeElement === first || !inside)) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !inside)) {
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

  return (
    <div className="zen-modal" role="presentation">
      <div ref={dialog} className="zen-modal__dialog zen-card" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId}>{title}</h2>
        {children}
      </div>
    </div>
  )
}
