import { LayoutGrid } from "lucide-react"
import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { BrandIcon } from "@/shared/brand"
import { IntegrationLogo } from "@/shared/logo/integration"
import { Mention, Prop } from "../section"

/** Where an app comes from: someone describes the thing they keep doing, and
 *  Milo sets it up in the same thread. */
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
          <Mention /> every Thursday one of us reads through the open PRs and
          Linear issues to work out what's actually ready to ship. Can you take
          it over?
        </ThreadMessage>
        <ThreadMessage author="Milo" isMilo time="09:12">
          Sure. I'll check GitHub and Linear every morning and again before the
          Thursday cut, and keep the state on one page for the team.
        </ThreadMessage>
        <ThreadMessage author="Milo" isMilo time="09:18">
          Set up and running. Two things are blocking 2.14 right now.
          <span className="mt-2 flex w-fit items-center gap-1.5 rounded-md border bg-background px-2 py-1 font-medium text-xs">
            <LayoutGrid className="size-3.5 text-muted-foreground" />
            Release readiness
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
  isMilo = false,
  time,
}: {
  author: string
  children: ReactNode
  initials?: string
  isMilo?: boolean
  time: string
}) {
  return (
    <div className="flex gap-3">
      <span
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-lg",
          isMilo
            ? undefined
            : "bg-secondary font-medium text-secondary-foreground text-xs"
        )}
      >
        {isMilo ? <BrandIcon className="size-7" /> : initials}
      </span>
      <div className="min-w-0">
        <p className="flex items-baseline gap-2 text-xs">
          <span className="font-semibold text-sm">{author}</span>
          {isMilo ? (
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
