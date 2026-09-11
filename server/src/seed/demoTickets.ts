// Demo Tickets, Public Comments, and Internal Notes for the IT Staff queue.
// Every status in §5.1 appears, so the queue's filters and badges have data.
export type SeedTicketStatus =
  | 'NEW'
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_REQUESTER'
  | 'RESOLVED'
  | 'CLOSED'
  | 'REOPENED'
  | 'CANCELLED'

export type SeedPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export type SeedEntry = {
  id: string
  authorEmail: string
  body: string
}

export type SeedTicket = {
  ticketNo: string
  requesterEmail: string
  ownerEmail: string | null
  categoryName: string
  relatedSystemName: string
  summary: string
  description: string
  requestedPriority: SeedPriority
  itPriority: SeedPriority
  status: SeedTicketStatus
  requesterResolved: boolean
  comments: readonly SeedEntry[]
  notes: readonly SeedEntry[]
}

/**
 * Seeded Ticket Numbers occupy a reserved 9xxxxx band so they can never collide
 * with a runtime allocation, which would have to reach 900,000 Tickets first.
 */
export const SEED_TICKET_BAND = 900_000

const SEED_YEAR = 2026

const ticketNo = (offset: number): string =>
  `TKT-${SEED_YEAR}-${String(SEED_TICKET_BAND + offset).padStart(6, '0')}`

// Fixed identifiers, so re-running the seed updates rather than duplicates.
const commentId = (n: number): string =>
  `11111111-1111-4111-8111-${String(n).padStart(12, '0')}`
const noteId = (n: number): string =>
  `22222222-2222-4222-8222-${String(n).padStart(12, '0')}`

const REQUESTER = {
  jennifer: 'jennifer.anderson@example.ac.th',
  michael: 'michael.brown@example.ac.th',
  sarah: 'sarah.johnson@example.ac.th',
  david: 'david.lee@example.ac.th',
} as const

const STAFF = {
  patricia: 'patricia.evans@example.ac.th',
  daniel: 'daniel.carter@example.ac.th',
  olivia: 'olivia.reed@example.ac.th',
  admin: 'margaret.hale@example.ac.th',
} as const

export const SEED_TICKETS: readonly SeedTicket[] = [
  {
    ticketNo: ticketNo(1),
    requesterEmail: REQUESTER.jennifer,
    ownerEmail: null,
    categoryName: 'Network',
    relatedSystemName: 'Campus Wi-Fi',
    summary: 'Wi-Fi drops in the east wing lecture rooms',
    description:
      'The connection drops for about thirty seconds every few minutes in rooms E201 to E204. It affects several laptops at once, so it does not look like a single device.',
    requestedPriority: 'MEDIUM',
    itPriority: 'MEDIUM',
    status: 'NEW',
    requesterResolved: false,
    comments: [],
    notes: [],
  },
  {
    ticketNo: ticketNo(2),
    requesterEmail: REQUESTER.michael,
    ownerEmail: null,
    categoryName: 'Hardware',
    relatedSystemName: 'Printer',
    summary: 'Shared printer jams on double-sided printing',
    description:
      'Single-sided printing works. Double-sided jams on the second sheet every time, on two different paper trays.',
    requestedPriority: 'HIGH',
    itPriority: 'HIGH',
    status: 'NEW',
    requesterResolved: false,
    comments: [
      {
        id: commentId(1),
        authorEmail: REQUESTER.michael,
        body: 'Adding that this started after the firmware update notice last week.',
      },
    ],
    notes: [],
  },
  {
    ticketNo: ticketNo(3),
    requesterEmail: REQUESTER.sarah,
    ownerEmail: STAFF.patricia,
    categoryName: 'Account and Access',
    relatedSystemName: 'Email',
    summary: 'Cannot send mail to external addresses',
    description:
      'Internal mail is delivered normally. External recipients bounce with a relay error.',
    requestedPriority: 'HIGH',
    itPriority: 'HIGH',
    status: 'OPEN',
    requesterResolved: false,
    comments: [
      {
        id: commentId(2),
        authorEmail: STAFF.patricia,
        body: 'Thank you for the report. I have picked this up and will check the relay configuration today.',
      },
    ],
    notes: [
      {
        id: noteId(1),
        authorEmail: STAFF.patricia,
        body: 'Relay allow-list looks truncated after the migration. Checking with the mail vendor before changing anything.',
      },
    ],
  },
  {
    ticketNo: ticketNo(4),
    requesterEmail: REQUESTER.david,
    ownerEmail: STAFF.daniel,
    categoryName: 'Software',
    relatedSystemName: 'LEB2 App',
    summary: 'Assignment upload fails for files over 10 MB',
    description:
      'The upload reaches one hundred percent and then reports a generic failure. Smaller files succeed.',
    requestedPriority: 'URGENT',
    itPriority: 'URGENT',
    status: 'IN_PROGRESS',
    requesterResolved: false,
    comments: [
      {
        id: commentId(3),
        authorEmail: STAFF.daniel,
        body: 'Reproduced on a test account. Working on it now.',
      },
      {
        id: commentId(4),
        authorEmail: REQUESTER.david,
        body: 'Thank you. The deadline is Friday, so any update before then would help.',
      },
    ],
    notes: [
      {
        id: noteId(2),
        authorEmail: STAFF.daniel,
        body: 'Proxy body limit is 10 MB while the application allows 25 MB. The two limits were never reconciled.',
      },
    ],
  },
  {
    ticketNo: ticketNo(5),
    requesterEmail: REQUESTER.jennifer,
    ownerEmail: STAFF.olivia,
    categoryName: 'Network',
    relatedSystemName: 'VPN',
    summary: 'VPN disconnects after roughly ten minutes',
    description:
      'The tunnel establishes normally and then drops. Reconnecting works, and it drops again after a similar interval.',
    requestedPriority: 'MEDIUM',
    itPriority: 'HIGH',
    status: 'WAITING_FOR_REQUESTER',
    requesterResolved: true,
    comments: [
      {
        id: commentId(5),
        authorEmail: STAFF.olivia,
        body: 'Could you confirm whether this happens on the campus network as well as from home?',
      },
    ],
    notes: [],
  },
  {
    ticketNo: ticketNo(6),
    requesterEmail: REQUESTER.michael,
    ownerEmail: STAFF.patricia,
    categoryName: 'Hardware',
    relatedSystemName: 'Corporate Laptop',
    summary: 'Laptop battery drains while shut down',
    description:
      'A full charge is gone by the next morning even when the machine is powered off rather than suspended.',
    requestedPriority: 'LOW',
    itPriority: 'MEDIUM',
    status: 'RESOLVED',
    requesterResolved: false,
    comments: [
      {
        id: commentId(6),
        authorEmail: STAFF.patricia,
        body: 'Firmware power setting corrected and the battery replaced. Please confirm it holds overnight.',
      },
    ],
    notes: [
      {
        id: noteId(3),
        authorEmail: STAFF.patricia,
        body: 'Battery was at sixty-one percent health. Replacement logged against the hardware budget.',
      },
    ],
  },
  {
    ticketNo: ticketNo(7),
    requesterEmail: REQUESTER.sarah,
    ownerEmail: STAFF.daniel,
    categoryName: 'Software',
    relatedSystemName: 'Grade Submission App',
    summary: 'Grade export produces an empty file',
    description:
      'The export completes without an error and downloads a file containing only the header row.',
    requestedPriority: 'MEDIUM',
    itPriority: 'LOW',
    status: 'CLOSED',
    requesterResolved: false,
    comments: [
      {
        id: commentId(7),
        authorEmail: STAFF.daniel,
        body: 'The export was filtered to a term with no enrolments. Closing as resolved; reopen if it recurs.',
      },
    ],
    notes: [],
  },
  {
    ticketNo: ticketNo(8),
    requesterEmail: REQUESTER.david,
    ownerEmail: STAFF.olivia,
    categoryName: 'Account and Access',
    relatedSystemName: 'Email',
    summary: 'Shared mailbox permissions lost again',
    description:
      'Access to the department mailbox was restored last month and has disappeared a second time.',
    requestedPriority: 'HIGH',
    itPriority: 'URGENT',
    status: 'REOPENED',
    requesterResolved: false,
    comments: [
      {
        id: commentId(8),
        authorEmail: REQUESTER.david,
        body: 'Reopening — the same permissions are missing as of this morning.',
      },
    ],
    notes: [
      {
        id: noteId(4),
        authorEmail: STAFF.olivia,
        body: 'Second occurrence. A nightly group sync is likely overwriting the manual grant; escalating rather than reapplying it by hand.',
      },
    ],
  },
  {
    ticketNo: ticketNo(9),
    requesterEmail: REQUESTER.jennifer,
    ownerEmail: null,
    categoryName: 'Software',
    relatedSystemName: 'LEB2 App',
    summary: 'Request for a second course workspace',
    description:
      'Raised in error — the workspace already existed under a different course code.',
    requestedPriority: 'LOW',
    itPriority: 'LOW',
    status: 'CANCELLED',
    requesterResolved: false,
    comments: [],
    notes: [],
  },
  {
    // Owned by the Administrator, so BR-16's "IT Staff or Administrator" has data.
    ticketNo: ticketNo(10),
    requesterEmail: REQUESTER.michael,
    ownerEmail: STAFF.admin,
    categoryName: 'Network',
    relatedSystemName: 'Campus Wi-Fi',
    summary: 'Guest network blocks conference registration site',
    description:
      'Visitors cannot reach the registration site from the guest network. It loads normally on staff Wi-Fi.',
    requestedPriority: 'URGENT',
    itPriority: 'URGENT',
    status: 'IN_PROGRESS',
    requesterResolved: true,
    comments: [
      {
        id: commentId(9),
        authorEmail: STAFF.admin,
        body: 'Taking this myself given the conference date. A temporary exception is in place while the category rule is reviewed.',
      },
    ],
    notes: [
      {
        id: noteId(5),
        authorEmail: STAFF.admin,
        body: 'Content filter classifies the vendor domain as uncategorised. Exception expires at the end of the month.',
      },
    ],
  },
]
