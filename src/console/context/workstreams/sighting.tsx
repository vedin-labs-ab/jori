import { type Integration, integrationLabel } from "@contracts/integrations"
import { ExpandableText } from "@/components/ui/expandable-text"
import { SeparatorDot } from "../../shared/dot"
import { IntegrationLogo } from "../../shared/logo/integration"
import { relativeTime } from "../../shared/time"

export type SightingRow = {
  id: string
  integration: Integration | null
  kind: string
  why: string
  observedAt: number
  url?: string
}

// One cited source record: the header row links out to the artifact when the
// source has one; the description stays outside the link so it can expand in
// place.
export function Sighting({ sighting }: { sighting: SightingRow }) {
  const header = (
    <>
      {sighting.integration === null ? null : (
        <IntegrationLogo decorative integration={sighting.integration} />
      )}
      <span className="font-medium text-sm">
        {sighting.integration === null
          ? "Removed tool"
          : integrationLabel(sighting.integration)}
      </span>
      <SeparatorDot className="shrink-0 text-muted-foreground/60" />
      <span className="min-w-0 truncate text-muted-foreground text-xs">
        {sighting.kind}
      </span>
      <span className="ml-auto shrink-0 text-muted-foreground text-xs">
        {relativeTime(sighting.observedAt, Date.now())}
      </span>
    </>
  )

  return (
    <li className="flex flex-col gap-0.5 p-3">
      {sighting.url === undefined ? (
        <div className="flex min-w-0 items-center gap-2">{header}</div>
      ) : (
        <a
          href={sighting.url}
          target="_blank"
          rel="noreferrer"
          className="-mx-1.5 -my-1 flex min-w-0 items-center gap-2 rounded-sm px-1.5 py-1 transition-colors hover:bg-muted/50"
        >
          {header}
        </a>
      )}
      <div className="text-muted-foreground text-sm">
        <ExpandableText maxLines={2}>{sighting.why}</ExpandableText>
      </div>
    </li>
  )
}
