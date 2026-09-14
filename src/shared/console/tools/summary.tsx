import { type ToolSurface, toolSurfaceLabel } from "@contracts/integrations"
import { Globe } from "lucide-react"
import { countLabel } from "@/shared/console/count"
import { SeparatorDot } from "@/shared/console/dot"
import { RowMark } from "@/shared/console/list/mark"
import { ProviderLogo } from "@/shared/logo/provider"
import { LogoStack } from "@/shared/logo/stack"

/** What a job can reach, on one line: the marks of the integrations it
 *  was given, how many of their tools, and the globe when it may also
 *  reach the web. The web is off unless someone turned it on, so a row
 *  says nothing when it is off and marks the exception when it is on. */
export function ToolAccessSummary({
  surfaces,
  toolCount,
  webSearch,
}: {
  surfaces: ToolSurface[]
  toolCount: number
  webSearch: boolean
}) {
  return (
    <span className="flex min-w-0 items-center gap-2 text-foreground">
      <LogoStack
        items={surfaces}
        label={toolSurfaceLabel}
        renderLogo={(surface) => (
          <ProviderLogo className="size-4" surface={surface} />
        )}
      />
      <span className="truncate">{countLabel(toolCount, "tool")}</span>
      {webSearch ? (
        <>
          <SeparatorDot className="shrink-0 text-muted-foreground/60" />
          <RowMark icon={<Globe />} label="Web access allowed" />
        </>
      ) : null}
    </span>
  )
}
