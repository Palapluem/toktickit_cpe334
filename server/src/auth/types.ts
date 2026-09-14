// The authenticated identity handlers see. Never carries a hash or a token (SEC-003).
export type Role = 'REQUESTER' | 'IT_STAFF' | 'ADMINISTRATOR'

export type AuthenticatedUser = {
  id: string
  displayName: string
  email: string
  role: Role
  mustChangePassword: boolean
}
