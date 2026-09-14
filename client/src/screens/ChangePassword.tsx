// Mandatory Change Password (ui-spec §7). Authenticated, no navigation.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiRequestError, changePassword } from '../api.js'
import { Button } from '../components/Button.js'
import { FormField } from '../components/FormField.js'
import { useSession } from '../context/SessionContext.js'
import { homeFor } from '../routes.js'

/** Stated before the user types, not only on failure (ui-spec §7). */
export const MIN_PASSWORD_LENGTH = 10

const LENGTH_RULE = `Use at least ${MIN_PASSWORD_LENGTH} characters.`

type Errors = {
  currentPassword?: string
  newPassword?: string
  confirmPassword?: string
}

const FIELD_ORDER = ['currentPassword', 'newPassword', 'confirmPassword'] as const

function validate(current: string, next: string, confirm: string): Errors {
  const errors: Errors = {}
  if (!current) errors.currentPassword = 'Current password is required.'
  if (next.length < MIN_PASSWORD_LENGTH) errors.newPassword = LENGTH_RULE
  else if (next === current) {
    errors.newPassword = 'New password must be different from the current one.'
  }
  if (confirm !== next) errors.confirmPassword = 'The two passwords do not match.'
  return errors
}

export function ChangePassword() {
  const navigate = useNavigate()
  const { user, refresh } = useSession()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    const nextErrors = validate(current, next, confirm)
    setErrors(nextErrors)
    const firstInvalid = FIELD_ORDER.find((field) => nextErrors[field])
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus()
      return
    }

    setSubmitting(true)
    try {
      await changePassword(current, next)
      await refresh()
      navigate(homeFor(user?.role ?? 'REQUESTER'), { replace: true })
    } catch (error) {
      setSubmitting(false)
      if (!(error instanceof ApiRequestError)) {
        setErrors({ newPassword: 'The password could not be changed. Try again.' })
        return
      }
      // A wrong current password belongs on that field, not in a page banner
      // (ui-spec §7): a banner makes the reader hunt for what to retype.
      if (error.status === 401) {
        setErrors({ currentPassword: 'Current password is incorrect.' })
        return
      }
      const fromServer: Errors = {}
      for (const field of error.fieldErrors) {
        if ((FIELD_ORDER as readonly string[]).includes(field.field)) {
          fromServer[field.field as keyof Errors] = field.message
        }
      }
      setErrors(
        Object.keys(fromServer).length > 0
          ? fromServer
          : { newPassword: 'The password was not accepted.' },
      )
    }
  }

  return (
    <div className="zen-auth">
      <form className="zen-auth__card zen-card" onSubmit={handleSubmit} noValidate>
        <h1 className="zen-auth__heading">Choose a new password</h1>
        <p className="zen-auth__detail">
          Your account is using an initial password. Choose a new one to continue.
        </p>

        <FormField
          id="currentPassword"
          label="Current password"
          required
          error={errors.currentPassword}
        >
          <input
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
          />
        </FormField>

        <FormField
          id="newPassword"
          label="New password"
          required
          hint={LENGTH_RULE}
          error={errors.newPassword}
        >
          <input
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(event) => setNext(event.target.value)}
          />
        </FormField>

        <FormField
          id="confirmPassword"
          label="Confirm new password"
          required
          error={errors.confirmPassword}
        >
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
          />
        </FormField>

        <Button
          type="submit"
          variant="primary"
          className="zen-auth__submit"
          busy={submitting}
          busyLabel="Saving…"
        >
          Save and continue
        </Button>
      </form>
    </div>
  )
}
