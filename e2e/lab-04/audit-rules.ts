// UNIT-09 · lab-04 AC-41 — what the journey audit lets through: a declared event, exactly, and the one console line it causes.
export type Rule =
  | { kind: 'response'; reason: string; status: number; method: string; url: RegExp }
  | { kind: 'failedRequest'; reason: string; method: string; url: RegExp }
  | { kind: 'console'; reason: string; pattern: RegExp }

export type Observation =
  | { kind: 'response'; status: number; method: string; url: string }
  | { kind: 'failedRequest'; method: string; url: string; failure: string }
  | { kind: 'console'; text: string }
  | { kind: 'pageError'; message: string }

const LOAD_FAILED = /^Failed to load resource/
const WITH_STATUS = /^Failed to load resource: the server responded with a status of (\d{3})/

const pathOf = (url: string) => {
  try {
    return new URL(url).pathname
  } catch {
    return url
  }
}

/** The observations no rule declares. A declared response or failed request also licenses one browser "Failed to load resource" line each. */
export function unexpected(observations: Observation[], rules: Rule[]): string[] {
  const findings: string[] = []
  const answered = new Map<number, number>()
  let failedRequests = 0

  for (const item of observations) {
    if (item.kind === 'response') {
      const declared = rules.some((rule) => rule.kind === 'response' && rule.status === item.status && rule.method === item.method && rule.url.test(pathOf(item.url)))
      if (declared) answered.set(item.status, (answered.get(item.status) ?? 0) + 1)
      else findings.push(`HTTP ${item.status}: ${item.method} ${item.url}`)
    } else if (item.kind === 'failedRequest') {
      const declared = rules.some((rule) => rule.kind === 'failedRequest' && rule.method === item.method && rule.url.test(pathOf(item.url)))
      if (declared) failedRequests += 1
      else findings.push(`request failed: ${item.method} ${item.url} ${item.failure}`)
    }
  }

  const consoleRule = (text: string) => rules.some((rule) => rule.kind === 'console' && rule.pattern.test(text))
  for (const item of observations) {
    if (item.kind === 'pageError') {
      if (!consoleRule(item.message)) findings.push(`page error: ${item.message}`)
    } else if (item.kind === 'console') {
      const status = WITH_STATUS.exec(item.text)?.[1]
      if (status !== undefined && (answered.get(Number(status)) ?? 0) > 0) answered.set(Number(status), answered.get(Number(status))! - 1)
      else if (status === undefined && LOAD_FAILED.test(item.text) && failedRequests > 0) failedRequests -= 1
      else if (!consoleRule(item.text)) findings.push(`console error: ${item.text}`)
    }
  }
  return findings
}
