import { type TableColumn, type TableRow } from "@/shared/console/tables/types"
import { day, hour, minute } from "../clock"
import { folderId } from "../folders"
import { demoId } from "../ids"
import { personId, teamIds } from "../people"
import { type DemoTable } from "../types"

export const renewalsTableId = demoId("collections", "renewals")

export function demoTables(now: number): DemoTable[] {
  return [
    renewalsTable(now),
    flakyTests(now),
    competitorMoves(now),
    vendorInvoices(now),
  ]
}

/** The table the hero, the grid, and the sharing section all open on. */
function renewalsTable(now: number): DemoTable {
  const columns = [
    column("customer", "Customer", "string", true),
    column("renews", "Renews", "string"),
    column("status", "Status", "string"),
    column("paid", "Paid", "boolean"),
    column("reminded", "Reminded", "boolean"),
  ]
  const values = [
    ["Harbor House", "Sep 24", "At risk", false, false],
    ["Beacon Works", "Oct 2", "On track", true, false],
    ["Juniper Supply", "Oct 9", "On track", true, false],
    ["Larkspur Hotels", "Oct 15", "On track", false, true],
  ]
  const added = [
    now - 3 * minute,
    now - 12 * day,
    now - 12 * day,
    now - 9 * day,
  ]

  return {
    kind: "table",
    id: renewalsTableId,
    name: "Customer renewals",
    description: "Every renewal in the next quarter, with who owes what.",
    folderId: folderId("renewals"),
    visibility: { mode: "teams", teamIds: [teamIds.finance] },
    ownerId: personId("maya"),
    createdAt: now - 30 * day,
    updatedAt: now - 3 * minute,
    columns,
    rows: values.map((row, index) =>
      tableRow("renewals", index + 1, columns, row, added[index])
    ),
  }
}

function flakyTests(now: number) {
  return table(now, {
    key: "flaky",
    name: "Flaky tests",
    description: "Tests that failed more than once this month.",
    folder: "engineering",
    columns: [
      column("test", "Test", "string", true),
      column("failures", "Failures", "integer"),
      column("lastFailed", "Last failed", "string"),
      column("owner", "Owner", "string"),
    ],
    rows: [
      ["payroll/sync.test.ts", 7, "Sep 2", "Jonas Berg"],
      ["billing/invoice.test.ts", 3, "Aug 30", "Liv Andersen"],
      ["auth/session.test.ts", 2, "Aug 28", "Kim Park"],
      ["export/csv.test.ts", 1, "Aug 27", "Ravi Menon"],
    ],
    updatedAt: now - 2 * hour,
  })
}

function competitorMoves(now: number) {
  return table(now, {
    key: "competitors",
    name: "Competitor moves",
    description: "Pricing and packaging changes the watch has seen.",
    folder: "marketing",
    columns: [
      column("company", "Company", "string", true),
      column("change", "Change", "string"),
      column("source", "Source", "string"),
      column("seen", "Seen", "string"),
    ],
    rows: [
      [
        "Northwind",
        "Raised the Team plan to $18 a seat",
        "Pricing page",
        "Sep 1",
      ],
      ["Lumen", "Opened an EU region", "Changelog", "Aug 29"],
      ["Tidewater", "Dropped the free tier", "Blog", "Aug 26"],
    ],
    updatedAt: now - day,
  })
}

function vendorInvoices(now: number) {
  return table(now, {
    key: "invoices",
    name: "Vendor invoices",
    description: "What Copperline owes, and what it has paid.",
    folder: "finance",
    owner: "priya",
    columns: [
      column("vendor", "Vendor", "string", true),
      column("amount", "Amount", "float"),
      column("due", "Due", "string"),
      column("paid", "Paid", "boolean"),
    ],
    rows: [
      ["Pixelmill Studio", 4200, "Sep 12", false],
      ["Cloudreach Hosting", 1180.5, "Sep 5", true],
      ["Ferrous Print", 640, "Sep 19", false],
    ],
    updatedAt: now - 6 * hour,
  })
}

function table(
  now: number,
  spec: {
    key: string
    name: string
    description: string
    folder: string
    owner?: string
    columns: TableColumn[]
    rows: unknown[][]
    updatedAt: number
  }
): DemoTable {
  return {
    kind: "table",
    id: demoId("collections", spec.key),
    name: spec.name,
    description: spec.description,
    folderId: folderId(spec.folder),
    visibility: { mode: "organization" },
    ownerId: spec.owner === undefined ? undefined : personId(spec.owner),
    createdAt: now - 25 * day,
    updatedAt: spec.updatedAt,
    columns: spec.columns,
    rows: spec.rows.map((values, index) =>
      tableRow(spec.key, index + 1, spec.columns, values, spec.updatedAt)
    ),
  }
}

function column(
  id: string,
  name: string,
  type: TableColumn["type"],
  required = false
): TableColumn {
  return { id, name, type, ...(required ? { required: true as const } : {}) }
}

/** One row, its values keyed by column id in the columns' order. */
function tableRow(
  tableKey: string,
  index: number,
  columns: TableColumn[],
  values: unknown[],
  at: number
): TableRow {
  return {
    rowId: demoId("documents", `${tableKey}-${index}`),
    values: Object.fromEntries(
      columns.map((entry, position) => [entry.id, values[position]])
    ),
    version: 1,
    createdAt: at,
    updatedAt: at,
  }
}
