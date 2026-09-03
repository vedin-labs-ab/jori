import { type Id } from "../../_generated/dataModel"
import { type MutationCtx } from "../../_generated/server"
import { clearOrganization, daysAgo, type SeedContext } from "../context"
import { resolveOwners } from "../people"
import { resolveFolders } from "./folders"

// The documents a team accumulates around the work: the postmortem the
// incident channel promised, the release notes, the brief a renewal was
// prepared from. Bodies live here so the seed can upload them to storage;
// what lands in the files table is the row that points at them.

type SeedFile = {
  key: string
  name: string
  mimeType: string
  folder: string
  /** Days before the seed instant the file was saved. */
  created: number
  /** Who saved it, by the local part of their address. */
  owner: string
  body: string
}

export const files: SeedFile[] = [
  {
    key: "postmortem",
    owner: "oskar",
    name: "Slack reconnect postmortem.md",
    mimeType: "text/markdown",
    folder: "Incidents",
    created: 24,
    body: [
      "# Slack reconnect failures",
      "",
      "**Impact.** Five workspaces could not reconnect Slack for nine days. Northwind Systems (180 seats) was the largest; three of the five did not notice.",
      "",
      "**Cause.** Slack returns a rotated refresh token inside `authed_user`. We read it from the outer response body, where it is absent, and persisted `undefined`. The old token then expired with nothing to replace it, and every reconnect returned `invalid_grant`.",
      "",
      "**Why it took nine days.** Nothing watches token age. The failure only became visible when a customer tried to reconnect and told support.",
      "",
      "**Fix.** Read the rotated token from `authed_user`, shipped the same morning. Affected workspaces reconnected manually.",
      "",
      "**Follow-ups.**",
      "",
      "1. A reconnect health check that exercises the full OAuth round trip nightly.",
      "2. An alert when a workspace's stored token is older than its expiry.",
    ].join("\n"),
  },
  {
    key: "release",
    owner: "elin",
    name: "March release notes.md",
    mimeType: "text/markdown",
    folder: "Releases",
    created: 9,
    body: [
      "# March release",
      "",
      "## Per-folder permissions",
      "",
      "Visibility now cascades from a folder over everything filed inside it. A viewer has to be allowed by every ancestor folder as well as by the item itself. Moving a folder can change who sees its contents, and the move dialog says so before you confirm.",
      "",
      "## Usage",
      "",
      "A page for what Jori costs, broken down by folder, job, and person. Days are bucketed in your organization's own timezone rather than UTC.",
      "",
      "## Shared workspaces",
      "",
      "Tables and stores can be shared with a read-only link that expires.",
      "",
      "## Moved to April",
      "",
      "SSO with Entra ID, and usage broken down by team.",
    ].join("\n"),
  },
  {
    key: "renewal",
    owner: "tobias",
    name: "Northwind renewal brief.md",
    mimeType: "text/markdown",
    folder: "Customers",
    created: 16,
    body: [
      "# Northwind Systems — renewal, February",
      "",
      "180 seats, Enterprise, EUR 7,400 MRR. Owner: Tobias Ek.",
      "",
      "**Usage.** 142 of 180 seats active in the last 30 days. Heaviest use in their operations team, which runs the weekly supplier digest.",
      "",
      "**History.** Hit by the Slack reconnect incident in August; nine days broken, resolved same day once reported. They were unhappy about the silence, not the bug.",
      "",
      "**Open asks.** Per-folder permissions — shipped in March, and worth leading with. Audit log of every run — in progress, no date promised.",
      "",
      "**Position.** No discount. They are above the seat minimum and expanding. If they push, offer the audit log beta rather than price.",
    ].join("\n"),
  },
  {
    key: "pipeline",
    owner: "tobias",
    name: "Pipeline export.csv",
    mimeType: "text/csv",
    folder: "Pipeline",
    created: 5,
    body: [
      "Account,Stage,Seats,ACV EUR,Owner,Last touch,Next step",
      "Kessler Group,Closed won,90,48600,Tobias Ek,2026-08-21,Kickoff booked",
      "Holmberg Retail,Security review,45,18900,Tobias Ek,2026-08-27,Answer questionnaire",
      "Aurora Freight,Quiet,30,12600,Tobias Ek,2026-08-16,One more note then park",
      "Sundberg Care,Discovery,60,25200,Tobias Ek,2026-08-29,Second call",
      "Lund Industrial,Discovery,25,10500,Tobias Ek,2026-08-25,Send pricing",
      "Ostgota Bank,Qualified out,400,0,Tobias Ek,2026-08-11,On-premise only",
    ].join("\n"),
  },
  {
    key: "security",
    owner: "priya",
    name: "Holmberg security questionnaire.md",
    mimeType: "text/markdown",
    folder: "Support",
    created: 11,
    body: [
      "# Holmberg Retail — security review",
      "",
      "**Where is data stored?** Convex, in the EU region. Files are stored alongside the deployment; nothing leaves the region.",
      "",
      "**Who at Vedin Labs can read customer data?** Two engineers, through an audited path, and only to resolve a reported problem.",
      "",
      "**Is customer data used to train models?** No. Inference runs against hosted models with training disabled by contract.",
      "",
      "**Can Jori be limited to some channels?** Yes. Private places never travel into a run outside them, and per-folder permissions cascade over everything filed inside a folder.",
      "",
      "**Retention on deletion?** Run history and files are removed within 30 days of an account closing.",
      "",
      "_Pending: Johan to confirm the subprocessor list is current before this goes back._",
    ].join("\n"),
  },
  {
    key: "invoices",
    owner: "johan",
    name: "August vendor invoices.csv",
    mimeType: "text/csv",
    folder: "Vendors",
    created: 7,
    body: [
      "Vendor,Category,Amount EUR,Invoice date,Reconciled",
      "Anthropic,Model inference,4418.20,2026-08-01,yes",
      "Convex,Backend,890.00,2026-08-01,yes",
      "Vercel,Hosting,437.65,2026-08-03,yes",
      "Slack,Communication,312.00,2026-08-05,yes",
      "Linear,Issue tracking,208.00,2026-08-05,yes",
      "Notion,Documents,160.00,2026-08-07,yes",
      "Fortnox,Accounting,149.00,2026-08-12,no",
    ].join("\n"),
  },
]

/** Storage holds the bytes; this writes the rows that point at them. The
 *  script uploads first, because only a storage id can be written here. */
export async function seedFiles(
  ctx: MutationCtx,
  seed: SeedContext,
  uploads: { key: string; storageId: Id<"_storage">; size: number }[]
) {
  const owners = await resolveOwners(ctx, seed)
  const folders = await resolveFolders(ctx, seed)
  const stored = new Map(uploads.map((upload) => [upload.key, upload]))

  await clearOrganization(ctx, ["files"], seed.organizationId)

  for (const file of files) {
    const upload = stored.get(file.key)

    if (upload === undefined) {
      throw new Error(`No upload was made for ${file.key}.`)
    }

    const createdAt = daysAgo(seed, file.created, 13)

    await ctx.db.insert("files", {
      organizationId: seed.organizationId,
      visibility: { mode: "organization" },
      ownerId: owners(file.owner),
      storageId: upload.storageId,
      name: file.name,
      mimeType: file.mimeType,
      size: upload.size,
      folderId: folders.get(file.folder),
      createdAt,
      updatedAt: createdAt,
    })
  }

  return files.length
}
