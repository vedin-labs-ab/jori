import { Table2, Workflow } from "lucide-react"
import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { BrandIcon } from "@/shared/brand"
import { IntegrationLogo } from "@/shared/logo/integration"
import { Organization } from "../../demo/organization"
import { Mention, Prop } from "../../section"

/** Each message enters once, the reply after the ask, and neither moves
 *  for a reader who has asked for less motion. */
const entrance =
  "motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-1 motion-safe:fill-mode-both motion-safe:animation-duration-500"

/** Where a row comes from: someone asks in the thread, and Jori files the
 *  answer in the folder, with a link back to it. */
export function RenewalsThread({
  className,
  onOpenJob,
  onOpenTable,
}: {
  className?: string
  /** Opens the job the reply says will keep the row current. */
  onOpenJob: () => void
  /** Opens the table the reply filed into. */
  onOpenTable: () => void
}) {
  return (
    <Prop
      className={cn("shadow-lg", className)}
      hint={<Organization />}
      label={
        <>
          <IntegrationLogo className="size-3.5" integration="slack" />
          #finance
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
          Done. One row added, marked at risk.{" "}
          {/* A job named inside a sentence, read the way the console reads
              the name of anything you can open: the mark says what it is,
              the weight sets it apart, and the underline waits for a
              pointer. Inline rather than a flex row, so the mark rides the
              sentence's baseline instead of setting the line's height. */}
          <button
            className="group whitespace-nowrap rounded-sm font-medium"
            onClick={onOpenJob}
            type="button"
          >
            <Workflow className="mr-1 inline-block size-3.5 align-[-0.2em] text-muted-foreground" />
            <span className="underline-offset-2 group-focus-visible:underline group-hover:underline">
              Renewals watch
            </span>
          </button>{" "}
          will keep it current.
          {/* Slack's unfurl of the table the reply filed into. Inline text
              rather than a flex row, so the dot sits in the sentence's own
              spaces, and in two unbreakable halves so a narrow thread wraps
              the trail under the name whole rather than splitting each. */}
          <button
            className="mt-2 max-w-full rounded-md border bg-background px-2 py-1 text-left font-medium text-xs transition-colors hover:bg-muted"
            onClick={onOpenTable}
            type="button"
          >
            <span className="whitespace-nowrap">
              <Table2 className="mr-1.5 inline-block size-3.5 align-[-0.2em] text-muted-foreground" />
              Customer renewals
            </span>{" "}
            <span className="whitespace-nowrap font-normal text-muted-foreground">
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
