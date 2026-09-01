import { type SeedTable } from "./shape"

// The tables Vedin Labs runs itself on: what every release has to pass
// through, and what the company pays for each month.

export const operationsTables: SeedTable[] = [
  {
    name: "Release checklist",
    description:
      "The steps every release goes through. Copied forward each time; the notes column is where the exceptions get written down.",
    folder: "Releases",
    created: 94,
    updated: 6,
    columns: [
      ["Step", "string"],
      ["Owner", "string"],
      ["Done", "boolean"],
      ["Notes", "string"],
    ],
    rows: [
      [
        "Migrations reviewed and reversible",
        "Nadia Rahman",
        true,
        "Two backfills, both idempotent",
      ],
      ["Staging soak for 24 hours", "Oskar Hedlund", true, ""],
      [
        "Permissions cascade checked on a nested folder",
        "Nadia Rahman",
        true,
        "Caught a missing ancestor check",
      ],
      ["Changelog written", "Elin Bystrom", true, ""],
      [
        "Usage page behind a flag",
        "Nadia Rahman",
        true,
        "On for Vedin Labs only",
      ],
      [
        "Support briefed on what changed",
        "Priya Iyer",
        false,
        "Scheduled for Monday",
      ],
      [
        "Launch post published",
        "Elin Bystrom",
        false,
        "Held until the flag is on for everyone",
      ],
    ],
  },
  {
    name: "Vendor spend",
    description:
      "What Vedin Labs pays for every month, and when each contract comes up again. Johan reconciles it against the card statement.",
    folder: "Vendors",
    created: 60,
    updated: 11,
    columns: [
      ["Vendor", "string"],
      ["Category", "string"],
      ["Monthly cost", "float"],
      ["Renews", "string"],
      ["Owner", "string"],
    ],
    rows: [
      ["Anthropic", "Model inference", 4200, "2027-01-01", "Oskar Hedlund"],
      ["Convex", "Backend", 890, "2027-03-01", "Nadia Rahman"],
      ["Vercel", "Hosting", 420, "2027-03-01", "Nadia Rahman"],
      ["Linear", "Issue tracking", 208, "2026-12-01", "Mia Lindqvist"],
      ["Slack", "Communication", 312, "2026-11-01", "Johan Sandstrom"],
      ["Notion", "Documents", 160, "2027-02-01", "Johan Sandstrom"],
      ["Fortnox", "Accounting", 149, "2026-10-01", "Johan Sandstrom"],
    ],
  },
]
