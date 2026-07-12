import { type Integration, integrationLabel } from "@contracts/integrations"
import { ExpandableText } from "@/components/ui/expandable-text"
import { IntegrationLogo } from "@/shared/logo/integration"
import { SeparatorDot } from "../../shared/dot"
import { flushRowClassName } from "../../shared/flush"
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
// in place. On narrow screens the event kind wraps to its own line under the
// provider and timestamp instead of truncating away.
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
      <SeparatorDot className="shrink-0 text-muted-foreground/60 max-sm:hidden" />
      <span className="min-w-0 truncate text-muted-foreground text-xs max-sm:order-last max-sm:w-full">
        {receipt.kind}
      </span>
      <span className="ml-auto shrink-0 text-muted-foreground text-xs">
        {relativeTime(receipt.observedAt, Date.now())}
      </span>
    </>
  )

  return (
    <li className="flex flex-col gap-0.5 py-2.5 last:pb-0">
      {receipt.url === undefined ? (
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
          {header}
        </div>
      ) : (
        <a
          href={receipt.url}
          target="_blank"
          rel="noreferrer"
          className={flushRowClassName(
            "-my-1 min-w-0 flex-wrap gap-x-2 gap-y-0.5 py-1 font-normal"
          )}
        >
          {header}
        </a>
      )}
      <div className="text-muted-foreground text-sm">
        <ExpandableText maxLines={2}>{receipt.why}</ExpandableText>
      </div>
    </li>
  )
}
