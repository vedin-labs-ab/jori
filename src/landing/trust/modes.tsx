import { getToolPermission } from "@contracts/permissions"
import { Globe } from "lucide-react"
import { Jori } from "@/shared/brand"
import { ProviderLogo } from "@/shared/logo/provider"
import { Prop, Section } from "../section"

export function ModesSection() {
  return (
    <Section
      lede={
        <>
          Choose what <Jori tilt="right" /> can do in each connected account.
          Set tools to <ModeChip mode="allowed" />, <ModeChip mode="blocked" />,
          or <ModeChip mode="prompted" />.
        </>
      }
      title="Every tool has a mode"
    >
      <div className="grid items-start gap-10 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <div className="space-y-5 text-muted-foreground text-sm leading-relaxed">
          <p className="max-w-xl">
            You can allow Jori to read emails and draft replies while requiring
            approval to send them. Change tool permissions in the console.
            Changes take effect on the next run.
          </p>
          <p className="max-w-xl">
            Replying in the thread that asked stays on, so Jori can always
            report back. Everything else is yours to set.
          </p>
        </div>
        <ModeMatrix />
      </div>
    </Section>
  )
}

// Marketing shows the three modes a user configures; "required" tools are an
// implementation detail the trust page explains in prose.
const modeLabels = {
  allowed: "Allowed",
  blocked: "Blocked",
  prompted: "Ask first",
} as const

const modeStyles = {
  allowed: "border text-muted-foreground",
  blocked: "border border-dashed text-muted-foreground",
  prompted: "bg-primary/10 font-medium text-foreground",
} as const

type Mode = keyof typeof modeLabels

type ModeRow = {
  tool: string
  mode: Mode
}

/** A mode named in prose, drawn the way the matrix beside it draws it, so
 *  the lede's three words are the three chips a reader is about to see. */
function ModeChip({ mode }: { mode: Mode }) {
  return (
    <span
      className={`inline-block rounded-md px-2 py-0.5 text-[0.8em] leading-tight ${modeStyles[mode]}`}
    >
      {modeLabels[mode]}
    </span>
  )
}

const modeRows: readonly ModeRow[] = [
  { mode: "allowed", tool: "google_gmail_search_threads" },
  { mode: "allowed", tool: "google_gmail_create_draft" },
  { mode: "prompted", tool: "google_gmail_send_message" },
  { mode: "allowed", tool: "google_calendar_create_event" },
  { mode: "prompted", tool: "github_create_pull_request" },
  { mode: "blocked", tool: "web_search" },
]

/** Permission rows rendered from the live contract, so names and
 *  descriptions cannot drift from the product. */
function ModeMatrix() {
  return (
    <Prop hint="a few of the modes you set" label="Permissions">
      <div className="divide-y">
        {modeRows.map((row) => (
          <ModeMatrixRow key={row.tool} row={row} />
        ))}
      </div>
    </Prop>
  )
}

function ModeMatrixRow({ row }: { row: ModeRow }) {
  const permission = getToolPermission(row.tool)

  if (permission === undefined) {
    return null
  }

  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3">
      <div className="flex min-w-0 items-start gap-2.5">
        {/* Web tools live on the jori surface; a globe reads truer than the
            brand mark next to "Search web". */}
        {permission.surface === "jori" ? (
          <Globe className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ProviderLogo
            className="mt-0.5 size-4"
            surface={permission.surface}
          />
        )}
        <div className="min-w-0">
          <p className="font-medium text-sm">{permission.label}</p>
          <p className="mt-0.5 text-muted-foreground text-xs leading-relaxed">
            {permission.description}
          </p>
        </div>
      </div>
      <span
        className={`shrink-0 rounded-md px-2 py-0.5 text-xs ${modeStyles[row.mode]}`}
      >
        {modeLabels[row.mode]}
      </span>
    </div>
  )
}
