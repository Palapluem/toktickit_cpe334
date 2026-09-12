// Login (ui-spec §6). Anonymous, no shell.
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiRequestError, login } from '../api.js'
import { Button } from '../components/Button.js'
import { FormField } from '../components/FormField.js'
import { useSession } from '../context/SessionContext.js'
import { CHANGE_PASSWORD_ROUTE, homeFor } from '../routes.js'

// One message for every cause. It must not vary by cause, must not name the
// account, and must not hint that the email was recognised (BR-03, SEC-002).
const REFUSED = 'Invalid email or password.'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Errors = { email?: string; password?: string }

function validate(email: string, password: string): Errors {
  const errors: Errors = {}
  if (!email.trim()) errors.email = 'Email is required.'
  else if (!EMAIL_PATTERN.test(email.trim())) {
    errors.email = 'Enter a valid email address.'
  }
  if (!password) errors.password = 'Password is required.'
  return errors
}

export function Login() {
  const navigate = useNavigate()
  const { refresh } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const [failed, setFailed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (submitting) return

    const nextErrors = validate(email, password)
    setErrors(nextErrors)
    setFailed(false)
    const firstInvalid = Object.keys(nextErrors)[0]
    if (firstInvalid) {
      document.getElementById(firstInvalid)?.focus()
      return
    }

    setSubmitting(true)
    try {
      const user = await login(email.trim(), password)
      await refresh()
      navigate(
        user.mustChangePassword ? CHANGE_PASSWORD_ROUTE : homeFor(user.role),
        { replace: true },
      )
    } catch (error) {
      // Every failure reads the same, including one that is not the server's
      // refusal — a different message would leak which is which.
      void (error instanceof ApiRequestError)
      setFailed(true)
      setSubmitting(false)
    }
  }

  return (
    <main className="zen-auth zen-auth--standalone">
      <form className="zen-auth__card zen-card" onSubmit={handleSubmit} noValidate>
        <p className="zen-auth__brand">TokTickIT</p>
        <h1 className="zen-auth__heading">Sign in</h1>

        {failed ? (
          <p className="zen-auth__error" role="alert">
            {REFUSED}
          </p>
        ) : null}

        <FormField id="email" label="Email" required error={errors.email}>
          <input
            type="email"
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </FormField>

        <FormField id="password" label="Password" required error={errors.password}>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </FormField>

        <Button
          type="submit"
          variant="primary"
          className="zen-auth__submit"
          busy={submitting}
          busyLabel="Signing in…"
        >
          Sign in
        </Button>
      </form>
    </main>
  )
}
