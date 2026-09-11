// Password hashing behind one module so the algorithm can change in one place (§11.2).
// Stub: tests/lab-03/password.unit.test.ts drives out the behaviour.

/** Hash a plaintext password with a unique per-password salt (SEC-007). */
export async function hashPassword(_plain: string): Promise<string> {
  return ''
}

/** Verify an attempt against a stored hash. Never compares plaintext (SEC-007). */
export async function verifyPassword(
  _plain: string,
  _hash: string,
): Promise<boolean> {
  return false
}
