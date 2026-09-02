import { day, hour } from "../clock"
import { folderId } from "../folders"
import { demoId } from "../ids"
import { personId } from "../people"
import { type DemoFile } from "../types"

/** The files filed across Copperline's folders. The notes are text the
 *  editor holds in memory; the rest are real documents under /demo, so
 *  every one of them opens in the viewer the console has for its kind —
 *  the spreadsheet as the download-only page the console gives one. */
export function demoFiles(now: number): DemoFile[] {
  return [
    file({
      key: "notes",
      name: "Release notes 2.14.md",
      folder: "engineering",
      mimeType: "text/markdown",
      text: releaseNotes,
      updatedAt: now - 3 * day,
    }),
    file({
      key: "brief",
      name: "Launch brief.pdf",
      folder: "marketing",
      owner: "ida",
      mimeType: "application/pdf",
      asset: "/demo/launch-brief.pdf",
      size: 1_709,
      updatedAt: now - 2 * day,
    }),
    file({
      key: "forecast",
      name: "Q3 forecast.xlsx",
      folder: "finance",
      owner: "priya",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      asset: "/demo/q3-forecast.xlsx",
      size: 1_725,
      updatedAt: now - 4 * hour,
    }),
    file({
      key: "onboarding",
      name: "Onboarding flow.png",
      folder: "design",
      owner: "hanna",
      mimeType: "image/png",
      asset: "/demo/onboarding-flow.png",
      size: 34_937,
      updatedAt: now - 2 * day,
    }),
  ]
}

const releaseNotes = `# Copperline 2.14

Usage-based billing for hotels and venues that charge by room-night. The
release rolls out from Tuesday the 15th at 25 percent and widens each
morning while the checkout latency regression stays fixed.

## Usage-based billing

An invoice now covers a whole stay, whatever the stay was made of. Room
nights, minibar, and late checkout land as line items on one invoice, and
the renewal that follows reads the same lines back. Operators on the
Growth plan see the new invoice layout first; everyone else keeps the old
one until their next billing cycle.

Harbor House and Larkspur Hotels have run the beta since July. Both are
on the rollout's first slice.

## Fixes

- Seasonal pricing no longer double-applies when a stay crosses a season
  boundary.
- The renewals digest lists accounts by renewal date rather than by name.
- Exported CSVs quote customer names that contain commas.

## Known issues

Checkout latency climbs when a stay has more than forty line items. The
rollout holds at 25 percent until the fix in 2.14.1 ships.
`

/** Text files measure themselves; binary files carry the size of the
 *  asset that backs them. */
function file(spec: {
  key: string
  name: string
  folder: string
  owner?: string
  mimeType: string
  updatedAt: number
  text?: string
  asset?: string
  size?: number
}): DemoFile {
  return {
    kind: "file",
    id: demoId("files", spec.key),
    name: spec.name,
    folderId: folderId(spec.folder),
    visibility: { mode: "organization" },
    ownerId: spec.owner === undefined ? undefined : personId(spec.owner),
    createdAt: spec.updatedAt - 2 * hour,
    updatedAt: spec.updatedAt,
    mimeType: spec.mimeType,
    size: spec.size ?? textSize(spec.text ?? ""),
    source: spec.owner === undefined ? "run" : "upload",
    text: spec.text,
    asset: spec.asset,
  }
}

/** A text file's size in bytes, the way storage would count it. */
export function textSize(text: string) {
  return new TextEncoder().encode(text).length
}
