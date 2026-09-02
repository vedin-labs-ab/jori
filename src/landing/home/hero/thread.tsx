import { Table2 } from "lucide-react"
import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { BrandIcon } from "@/shared/brand"
import { IntegrationLogo } from "@/shared/logo/integration"
import { Mention, Prop } from "../../section"

/** Each message enters once, the reply after the ask, and neither moves
 *  for a reader who has asked for less motion. */
const entrance =
  "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:fill-mode-both motion-safe:animation-duration-500"

/** Where a row comes from: someone asks in the thread, and Jori files the
 *  answer in the folder, with a link back to it. */
export function RenewalsThread({
  className,
  onOpenTable,
}: {
  className?: string
  /** Opens the table the reply filed into. */
  onOpenTable: () => void
}) {
  return (
    <Prop
      className={cn("shadow-lg", className)}
      label={
        <>
          <IntegrationLogo className="size-3.5" integration="slack" />
          <span className="font-medium text-foreground">#finance</span>
          <span>Copperline</span>
        </>
      }
    >
      <div className="space-y-4 px-5 py-4">
        <ThreadMessage
          author="Maya Lund"
          className={cn(entrance, "motion-safe:delay-500")}
          initials="ML"
          time="09:12"
        >
          <Mention /> add Harbor House to the renewals table, Sep 24, and flag
          it at risk.
        </ThreadMessage>
        <ThreadMessage
          author="Jori"
          className={cn(entrance, "motion-safe:delay-[1300ms]")}
          isJori
          time="09:12"
        >
          Done. One row added, marked at risk. Renewals watch will keep it
          current.
          <button
            className="mt-2 flex w-fit items-center gap-1.5 rounded-md border bg-background px-2 py-1 font-medium text-xs transition-colors hover:bg-muted"
            onClick={onOpenTable}
            type="button"
          >
            <Table2 className="size-3.5 text-muted-foreground" />
            Customer renewals{" "}
            <span className="font-normal text-muted-foreground">
              · Finance › Renewals
            </span>
          </button>
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
  className,
  initials,
  isJori = false,
  time,
}: {
  author: string
  children: ReactNode
  className?: string
  initials?: string
  isJori?: boolean
  time: string
}) {
  return (
    <div className={cn("flex gap-3", className)}>
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
