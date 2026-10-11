// UNIT-08 · lab-04 BR-19 to BR-22, AC-18 — the status table printed in specification §5.2 is the one the code and the test oracle hold.
// The specification is read as text, so editing the table, `transitions.ts` or `transition-oracle.ts` alone fails here.
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Role } from '../../src/auth/types.js'
import { TICKET_STATUSES, allowedTransitions, type TicketStatus } from '../../src/tickets/transitions.js'
import { workflowFor } from '../../src/tickets/workflowRules.js'
import { REQUESTER_EDGES, STAFF_EDGES } from './transition-oracle.js'

type Cell = { edges: TicketStatus[]; gated: TicketStatus[]; cascading: TicketStatus[]; own: boolean }
type Row = { requester: Cell; staff: Cell }

const SPEC = new URL('../../../docs/lab-04/specification.md', import.meta.url)

function parseCell(text: string): Cell {
  const cell: Cell = { edges: [], gated: [], cascading: [], own: /\(own Ticket\)/.test(text) }
  for (const [, status, mark] of text.matchAll(/`([A-Z_]+)`(†|‡)?/g)) {
    cell.edges.push(status as TicketStatus)
    if (mark === '†') cell.gated.push(status as TicketStatus)
    if (mark === '‡') cell.cascading.push(status as TicketStatus)
  }
  return cell
}

function readTable(): Record<string, Row> {
  const lines = readFileSync(SPEC, 'utf8').split('\n')
  const start = lines.findIndex((line) => line.startsWith('### 5.2 '))
  expect(start, 'specification §5.2 exists').toBeGreaterThan(-1)
  const table: Record<string, Row> = {}
  for (const line of lines.slice(start)) {
    if (line.startsWith('### ') && !line.startsWith('### 5.2 ')) break
    const [, from, requester, staff] = line.split('|').map((part) => part.trim())
    if (!/^`[A-Z_]+`$/.test(from ?? '')) continue
    table[from.slice(1, -1)] = { requester: parseCell(requester), staff: parseCell(staff) }
  }
  return table
}

const spec = readTable()
const sorted = <T extends string>(list: readonly T[]) => [...list].sort()
const cellFor = (role: Role, from: TicketStatus) => (role === 'REQUESTER' ? spec[from].requester : spec[from].staff)

describe('UNIT-08 · AC-18 · BR-19 to BR-22 · specification §5.2 is the table the code and the oracle hold', () => {
  it('has one row for each of the eight statuses and no other', () => {
    expect(sorted(Object.keys(spec))).toEqual(sorted(TICKET_STATUSES))
  })

  for (const from of TICKET_STATUSES) {
    for (const role of ['REQUESTER', 'IT_STAFF', 'ADMINISTRATOR'] as Role[]) {
      it(`${role} from ${from}: the moves, the gate and the cascade`, () => {
        const cell = cellFor(role, from)
        const oracle = role === 'REQUESTER' ? REQUESTER_EDGES[from] : STAFF_EDGES[from]

        expect(sorted(allowedTransitions(role, from)), 'transitions.ts').toEqual(sorted(cell.edges))
        expect(sorted(oracle), 'transition-oracle.ts').toEqual(sorted(cell.edges))

        // † is the BR-20 gate: exactly these moves leave the offer while work is open, and none leaves it otherwise.
        expect(sorted(workflowFor(role, from, 1).blocked.map((blocked) => blocked.status)), 'gate with open work').toEqual(sorted(cell.gated))
        expect(workflowFor(role, from, 0).blocked, 'gate with no open work').toEqual([])

        // ‡ is the BR-22 cascade, which belongs to every move into CANCELLED and to no other.
        expect(cell.cascading, 'cascade marks').toEqual(cell.edges.filter((to) => to === 'CANCELLED'))
        // A Requester acts on their own Ticket only (BR-14); the Lab 3 route tests cover the refusal.
        if (role === 'REQUESTER') expect(cell.own, 'own Ticket marker on every Requester move').toBe(cell.edges.length > 0)
      })
    }
  }

  it('gives the Administrator the IT Staff column', () => {
    for (const from of TICKET_STATUSES) {
      expect(sorted(allowedTransitions('ADMINISTRATOR', from))).toEqual(sorted(allowedTransitions('IT_STAFF', from)))
    }
  })
})
