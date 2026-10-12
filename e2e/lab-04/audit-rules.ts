// UNIT-09 · lab-04 AC-41 — what the journey audit lets through: a declared event, exactly. (Stub: lets everything through.)
export type Rule =
  | { kind: 'response'; reason: string; status: number; method: string; url: RegExp }
  | { kind: 'failedRequest'; reason: string; method: string; url: RegExp }
  | { kind: 'console'; reason: string; pattern: RegExp }

export type Observation =
  | { kind: 'response'; status: number; method: string; url: string }
  | { kind: 'failedRequest'; method: string; url: string; failure: string }
  | { kind: 'console'; text: string }
  | { kind: 'pageError'; message: string }

export function unexpected(_observations: Observation[], _rules: Rule[]): string[] {
  return []
}
