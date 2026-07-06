import { type Integration, integrationLabel } from "@contracts/integrations"
import { ExternalLink } from "lucide-react"
import { ExpandableText } from "@/components/ui/expandable-text"
import { SeparatorDot } from "../../shared/dot"
import { IntegrationLogo } from "../../shared/logo/integration"
import { relativeTime } from "../../shared/time"

export type ReceiptRow = {
  id: string
  integration: Integration | null
  kind: string
  why: string
  observedAt: number
  url?: string
}

// One cited source record: the header row links out to the artifact when the
// receipt has one; the description stays outside the link so it can expand
// in place.
export function Receipt({ receipt }: { receipt: ReceiptRow }) {
  const header = (
    <>
      {receipt.integration === null ? null : (
        <IntegrationLogo decorative integration={receipt.integration} />
      )}
      <span className="font-medium text-sm">
        {receipt.integration === null
          ? "Removed tool"
          : integrationLabel(receipt.integration)}
      </span>
      <SeparatorDot className="shrink-0 text-muted-foreground/60" />
      <span className="min-w-0 truncate text-muted-foreground text-xs">
        {receipt.kind}
      </span>
      <span className="ml-auto shrink-0 text-muted-foreground text-xs">
        {relativeTime(receipt.observedAt, Date.now())}
      </span>
    </>
  )

  return (
    <li className="flex flex-col gap-0.5 py-2.5">
      {receipt.url === undefined ? (
        <div className="flex min-w-0 items-center gap-2">{header}</div>
      ) : (
        <a
          href={receipt.url}
          target="_blank"
          rel="noreferrer"
          className="-mx-1.5 -my-1 flex min-w-0 items-center gap-2 rounded-sm px-1.5 py-1 transition-colors hover:bg-muted/50"
        >
          {header}
          <ExternalLink
            aria-hidden
            className="size-3 shrink-0 text-muted-foreground"
          />
        </a>
      )}
      <div className="text-muted-foreground text-sm">
        <ExpandableText maxLines={2}>{receipt.why}</ExpandableText>
      </div>
    </li>
  )
}
