import { LayoutGrid } from "lucide-react"
import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { BrandIcon } from "@/shared/brand"
import { IntegrationLogo } from "@/shared/logo/integration"
import { Mention, Prop } from "../section"

/** Where an app comes from: someone hands over the job they keep doing, and
 *  Jori sets up the playbook in the same thread. */
export function Handover() {
  return (
    <Prop
      label={
        <>
          <IntegrationLogo className="size-3.5" integration="slack" />
          <span className="font-medium text-foreground">#eng</span>
          <span>Copperline</span>
        </>
      }
    >
      <div className="space-y-4 px-5 py-4">
        <ThreadMessage author="Maya Lund" initials="ML" time="09:12">
          <Mention /> every Monday I piece together where everything stands from
          GitHub, Linear, and this channel before our sync. Can you take that
          over?
        </ThreadMessage>
        <ThreadMessage author="Jori" isJori time="09:12">
          Sure. I'll read the week across your tools and keep the pre-read on
          one page, ready before the sync. Every line will link to where it came
          from.
        </ThreadMessage>
        <ThreadMessage author="Jori" isJori time="09:18">
          Set up and running. First one's ready, and two things stalled this
          week that nobody has flagged.
          <span className="mt-2 flex w-fit items-center gap-1.5 rounded-md border bg-background px-2 py-1 font-medium text-xs">
            <LayoutGrid className="size-3.5 text-muted-foreground" />
            Monday pre-read
            <span className="font-normal text-muted-foreground">
              shared with Copperline
            </span>
          </span>
        </ThreadMessage>
      </div>
    </Prop>
  )
}

// Slack's markers: squircle avatars, bold sender, the app tag Slack puts on
// bot messages.
function ThreadMessage({
  author,
  children,
  initials,
  isJori = false,
  time,
}: {
  author: string
  children: ReactNode
  initials?: string
  isJori?: boolean
  time: string
}) {
  return (
    <div className="flex gap-3">
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-lg",
          isJori
            ? undefined
            : "bg-secondary font-medium text-secondary-foreground text-xs"
        )}
      >
        {isJori ? <BrandIcon className="size-7" /> : initials}
      </span>
      <div className="min-w-0">
        <p className="flex items-baseline gap-2 text-xs">
          <span className="font-semibold text-sm">{author}</span>
          {isJori ? (
            <span className="rounded-sm bg-muted px-1 py-px font-medium text-[10px] text-foreground/70">
              APP
            </span>
          ) : null}
          <span className="text-muted-foreground tabular-nums">{time}</span>
        </p>
        <div className="mt-0.5 text-sm leading-relaxed">{children}</div>
      </div>
    </div>
  )
}
