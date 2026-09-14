// Password hashing behind one module so the algorithm can change in one place (§11.2).
import bcrypt from 'bcryptjs'

// bcrypt work factor. Raise it, never lower it; the stored hash records its own.
const COST = 10

/** Hash a plaintext password. bcrypt generates a unique salt per call (SEC-007). */
export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST)
}

/** Verify an attempt against a stored hash. A malformed hash is a failed match, not a crash. */
export async function verifyPassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash)
  } catch {
    return false
  }
}
