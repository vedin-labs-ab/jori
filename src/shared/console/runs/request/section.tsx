import { type LucideIcon } from "lucide-react"
import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { RunSectionLabel, type RunSectionLabelValue } from "../section"
import { type RunRequestNavigation } from "./carousel"
import { RunRequestPager } from "./pager"

export type RunRequestMeta = {
  Icon: LucideIcon
  iconClassName?: string
  label: string
}

export function RunRequestSection({
  actions,
  label,
  labelIcon: LabelIcon,
  meta,
  navigation,
  summary,
  title,
  titleIcon,
}: {
  actions?: ReactNode
  label: RunSectionLabelValue
  labelIcon: LucideIcon
  meta: RunRequestMeta | null
  navigation?: RunRequestNavigation
  summary: string
  title: string
  titleIcon: ReactNode
}) {
  return (
    // Its own container, like the detail rows it sits among.
    <div className="@container/run">
      <div className="grid gap-2 px-3 py-3 text-xs @sm/run:grid-cols-[10rem_1fr]">
        <div className="flex items-start gap-1.5 font-medium">
          <LabelIcon className="mt-0.5 size-3.5 text-muted-foreground" />
          <RunSectionLabel label={label} />
        </div>
        <div className="min-w-0">
          <div className="flex min-h-5 items-start justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <span className="inline-flex min-w-0 items-center gap-1.5 font-medium text-sm">
                {titleIcon}
                <span className="truncate">{title}</span>
              </span>
            </div>
            <RunRequestPager navigation={navigation} />
          </div>
          <p className="mt-2.5 text-foreground text-sm leading-relaxed">
            {summary}
          </p>
          <RunRequestFooter actions={actions} meta={meta} />
        </div>
      </div>
    </div>
  )
}

function RunRequestFooter({
  actions,
  meta,
}: {
  actions?: ReactNode
  meta: RunRequestMeta | null
}) {
  if (actions === undefined && meta === null) {
    return null
  }

  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
      <RunRequestMetaItem meta={meta} />
      {actions ?? null}
    </div>
  )
}

function RunRequestMetaItem({ meta }: { meta: RunRequestMeta | null }) {
  if (meta === null) {
    return null
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-muted-foreground">
      <span className="inline-flex items-center gap-1.5">
        <meta.Icon className={cn("size-3.5", meta.iconClassName)} />
        {meta.label}
      </span>
    </div>
  )
}
