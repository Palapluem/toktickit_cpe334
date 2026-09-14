// Administrator User Management (ui-spec §10).
//
// One screen, list plus a modal for create and edit. The labsheet's long
// "not required" list is a specification: no pagination, no multi-column
// sort, no multiple filters.
import { useCallback, useEffect, useState } from 'react'
import {
  ApiRequestError,
  createUser,
  fetchCurrentUser,
  fetchUsers,
  setUserInitialPassword,
  updateUser,
  type ManagedUser,
  type Role,
  type SessionUser,
} from '../api.js'
import { RoleBadge } from '../components/Badge.js'
import { Button } from '../components/Button.js'
import { FormField } from '../components/FormField.js'
import {
  EmptyState,
  ErrorState,
  ForbiddenState,
  LoadingState,
} from '../components/States.js'

const ROLES: Role[] = ['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR']

type Phase = 'loading' | 'ready' | 'forbidden' | 'failed'

type Filters = { search: string; role: string }

type DialogState =
  | { kind: 'create' }
  | { kind: 'edit'; user: ManagedUser }
  | null

type FieldErrors = Record<string, string>

function fieldErrorsFrom(error: unknown): FieldErrors {
  if (!(error instanceof ApiRequestError)) return {}
  const map: FieldErrors = {}
  for (const fieldError of error.fieldErrors) {
    map[fieldError.field] = fieldError.message
  }
  return map
}

function UserDialog({
  dialog,
  self,
  onClose,
  onSaved,
}: {
  dialog: { kind: 'create' } | { kind: 'edit'; user: ManagedUser }
  self: SessionUser | null
  onClose: () => void
  onSaved: (user: ManagedUser) => void
}) {
  const editing = dialog.kind === 'edit'
  const [displayName, setDisplayName] = useState(editing ? dialog.user.displayName : '')
  const [email, setEmail] = useState(editing ? dialog.user.email : '')
  const [role, setRole] = useState<Role>(editing ? dialog.user.role : 'REQUESTER')
  const [isActive, setIsActive] = useState(editing ? dialog.user.isActive : true)
  const [initialPassword, setInitialPassword] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)

  const isSelf = editing && self !== null && dialog.user.id === self.id

  async function submit() {
    if (busy) return
    setBusy(true)
    setErrors({})
    setFormError('')
    try {
      const saved = editing
        ? await updateUser(dialog.user.id, { displayName, email, role, isActive })
        : await createUser({ displayName, email, role, isActive, initialPassword })
      onSaved(saved)
      onClose()
    } catch (error) {
      const fromServer = fieldErrorsFrom(error)
      setErrors(fromServer)
      if (Object.keys(fromServer).length === 0) {
        // The client does not pre-compute the last-Administrator rule: the
        // count can change between render and submit, and a client-side guard
        // would be wrong at exactly the moment it mattered (ui-spec §10).
        setFormError(
          error instanceof ApiRequestError && error.code === 'LAST_ADMINISTRATOR'
            ? 'This is the only active Administrator. Assign another before changing this account.'
            : error instanceof ApiRequestError && error.code === 'CANNOT_DEACTIVATE_SELF'
              ? 'You cannot deactivate your own account.'
              : error instanceof ApiRequestError
                ? error.message
                : 'The change could not be saved. Try again.',
        )
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="zen-modal" role="presentation">
      <div
        className="zen-modal__dialog zen-card"
        role="dialog"
        aria-modal="true"
        aria-label={editing ? 'Edit User' : 'New User'}
      >
        <h2>{editing ? 'Edit User' : 'New User'}</h2>

        {formError ? (
          <p className="zen-auth__error" role="alert">
            {formError}
          </p>
        ) : null}

        <FormField id="user-name" label="Name" required error={errors.displayName}>
          <input
            value={displayName}
            disabled={busy}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </FormField>

        <FormField id="user-email" label="Email" required error={errors.email}>
          <input
            type="email"
            value={email}
            disabled={busy}
            onChange={(event) => setEmail(event.target.value)}
          />
        </FormField>

        <FormField id="user-role" label="Role" required error={errors.role}>
          <select
            value={role}
            disabled={busy}
            onChange={(event) => setRole(event.target.value as Role)}
          >
            {ROLES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </FormField>

        <label className="zen-checkbox">
          <input
            id="user-active"
            type="checkbox"
            checked={isActive}
            disabled={busy || isSelf}
            onChange={(event) => setIsActive(event.target.checked)}
          />
          Active
        </label>
        {isSelf ? (
          // Disabled here rather than absent: the control exists for every
          // other user, and hiding it only on this row is more confusing than
          // explaining it (ui-spec §10, SEC-034).
          <p className="zen-field__hint" title="You cannot deactivate your own account.">
            You cannot deactivate your own account.
          </p>
        ) : null}

        {!editing ? (
          <FormField
            id="user-initial-password"
            label="Initial password"
            required
            error={errors.initialPassword}
          >
            <input
              type="password"
              value={initialPassword}
              disabled={busy}
              onChange={(event) => setInitialPassword(event.target.value)}
            />
          </FormField>
        ) : null}

        <div className="zen-modal__actions">
          <Button variant="tertiary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant="primary" busy={busy} onClick={submit}>
            {editing ? 'Save Changes' : 'Create User'}
          </Button>
        </div>

        {editing ? (
          <div className="zen-modal__secondary-action">
            <Button
              variant="secondary"
              onClick={() => setShowPasswordDialog(true)}
            >
              Set New Initial Password
            </Button>
          </div>
        ) : null}
      </div>

      {editing && showPasswordDialog ? (
        <SetPasswordDialog
          user={dialog.user}
          onClose={() => setShowPasswordDialog(false)}
        />
      ) : null}
    </div>
  )
}

function SetPasswordDialog({
  user,
  onClose,
}: {
  user: ManagedUser
  onClose: () => void
}) {
  const [value, setValue] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)

  async function submit() {
    if (busy) return
    setBusy(true)
    setError('')
    try {
      // The password is never echoed back; this response has nothing to show
      // beyond confirmation (SEC-032).
      await setUserInitialPassword(user.id, value)
      setDone(true)
    } catch (cause) {
      setError(
        cause instanceof ApiRequestError
          ? cause.message
          : 'The initial password could not be set. Try again.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="zen-modal zen-modal--nested"
      role="dialog"
      aria-modal="true"
      aria-label="Set new initial password"
    >
      <div className="zen-card">
        <h3>Set new initial password</h3>
        {done ? (
          <>
            <p>The password was set. {user.displayName} must change it at next login.</p>
            <Button variant="secondary" onClick={onClose}>
              Close
            </Button>
          </>
        ) : (
          <>
            <p>
              This replaces {user.displayName}'s current password and ends their active
              sessions. They must change it at next login.
            </p>
            {error ? (
              <p className="zen-auth__error" role="alert">
                {error}
              </p>
            ) : null}
            <FormField id="new-initial-password" label="New initial password" required>
              <input
                type="password"
                value={value}
                disabled={busy}
                onChange={(event) => setValue(event.target.value)}
              />
            </FormField>
            <div className="zen-modal__actions">
              <Button variant="tertiary" onClick={onClose} disabled={busy}>
                Cancel
              </Button>
              <Button variant="primary" busy={busy} onClick={submit}>
                Save
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function UserManagement() {
  const [self, setSelf] = useState<SessionUser | null>(null)
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [filters, setFilters] = useState<Filters>({ search: '', role: '' })
  const [searchInput, setSearchInput] = useState('')
  const [phase, setPhase] = useState<Phase>('loading')
  const [dialog, setDialog] = useState<DialogState>(null)
  const [retryNumber, setRetryNumber] = useState(0)

  useEffect(() => {
    fetchCurrentUser()
      .then(setSelf)
      .catch(() => setSelf(null))
  }, [])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setFilters((current) =>
        current.search === searchInput ? current : { ...current, search: searchInput },
      )
    }, 300)
    return () => window.clearTimeout(timeoutId)
  }, [searchInput])

  useEffect(() => {
    let cancelled = false
    setPhase('loading')
    fetchUsers(filters)
      .then((next) => {
        if (cancelled) return
        setUsers(next)
        setPhase('ready')
      })
      .catch((error) => {
        if (cancelled) return
        setPhase(
          error instanceof ApiRequestError && error.status === 403 ? 'forbidden' : 'failed',
        )
      })
    return () => {
      cancelled = true
    }
  }, [filters, retryNumber])

  const upsert = useCallback((user: ManagedUser) => {
    setUsers((current) => {
      const index = current.findIndex((row) => row.id === user.id)
      if (index === -1) return [...current, user]
      const next = [...current]
      next[index] = user
      return next
    })
  }, [])

  return (
    <div className="my-tickets-page user-management">
      <header className="my-tickets-page__header">
        <div>
          <h1>User Management</h1>
          <p>Create and edit accounts, and set initial passwords.</p>
        </div>
        <Button variant="primary" onClick={() => setDialog({ kind: 'create' })}>
          New User
        </Button>
      </header>

      <div className="my-tickets__filters">
        <FormField id="user-search" label="Search">
          <input
            type="search"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </FormField>
        <FormField id="user-role-filter" label="Role">
          <select
            value={filters.role}
            onChange={(event) =>
              setFilters((current) => ({ ...current, role: event.target.value }))
            }
          >
            <option value="">Any role</option>
            {ROLES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </FormField>
      </div>

      {phase === 'loading' ? <LoadingState label="Loading users…" /> : null}

      {phase === 'forbidden' ? (
        <ForbiddenState detail="User Management is available to Administrators." />
      ) : null}

      {phase === 'failed' ? (
        <ErrorState
          title="The user list could not be loaded"
          detail="Something went wrong while fetching users."
          onRetry={() => setRetryNumber((value) => value + 1)}
        />
      ) : null}

      {phase === 'ready' && users.length === 0 ? (
        <EmptyState title="No users match these filters." detail="Adjust the search or role filter." />
      ) : null}

      {phase === 'ready' && users.length > 0 ? (
        <div className="my-tickets__table-container zen-scroll-x">
          <table className="my-tickets__table user-management__table">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Email</th>
                <th scope="col">Role</th>
                <th scope="col">Status</th>
                <th scope="col">Edit</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td data-label="Name">{user.displayName}</td>
                  <td data-label="Email">{user.email}</td>
                  <td data-label="Role">
                    <RoleBadge value={user.role} />
                  </td>
                  <td data-label="Status">
                    <span
                      className={`zen-badge ${user.isActive ? 'zen-badge--status-resolved' : 'zen-badge--status-quiet'}`}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td data-label="Edit">
                    <Button
                      variant="tertiary"
                      onClick={() => setDialog({ kind: 'edit', user })}
                    >
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {dialog ? (
        <UserDialog
          dialog={dialog}
          self={self}
          onClose={() => setDialog(null)}
          onSaved={upsert}
        />
      ) : null}
    </div>
  )
}
