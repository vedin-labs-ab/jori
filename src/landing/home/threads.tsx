import { FileText } from "lucide-react"
import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { BrandIcon } from "@/shared/brand"
import { IntegrationLogo } from "@/shared/logo/integration"
import { Mention, Prop, Section } from "../section"
import { GitHubMention, LinearMention } from "./mentions"

export function Threads() {
  return (
    <Section
      lede="There's no Milo app to keep open. Reach it where the work is, and it reports back in the same thread."
      title="Where work already happens"
    >
      <div className="grid items-start gap-10 md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
        <div>
          <p className="max-w-xl text-muted-foreground text-sm leading-relaxed">
            Mention Milo in Slack, GitHub, or Linear. It reacts in seconds so
            you know it's on it, then answers when it has something worth
            saying. Ask for a summary, a write-up, a check, a draft: the thread
            is the interface.
          </p>
          <div className="mt-6 space-y-4">
            <GitHubMention />
            <LinearMention />
          </div>
        </div>
        <SupportThread />
      </div>
    </Section>
  )
}

// A Slack thread with Slack's markers: the squircle avatars, bold sender,
// and the blue tint of a reaction you added.
function SupportThread() {
  return (
    <Prop
      label={
        <>
          <IntegrationLogo className="size-3.5" integration="slack" />
          <span className="font-medium text-foreground">#support</span>
          <span>Copperline</span>
        </>
      }
    >
      <div className="space-y-4 px-5 py-4">
        <ThreadMessage author="Priya Nair" initials="PN" time="14:03">
          Harbor House flagged Tuesday's payroll run: tips double-counted at two
          locations. <Mention /> can you pull together what we know?
          {/* Baseline flow, not flex centering: the digit's ink sits above
              the baseline while the emoji overflows its em box, so centered
              boxes still read misaligned. The 1px nudge recenters the pair
              inside the pill (emoji ink overflows more above than below). */}
          <span
            aria-hidden="true"
            className="mt-2 inline-block w-fit rounded-full border border-[#1264a3]/30 bg-[#1d9bd1]/10 px-2 py-0.5 text-[#1264a3] text-xs leading-none"
          >
            <span className="inline-block translate-y-px">
              👀 <span className="tabular-nums">1</span>
            </span>
          </span>
        </ThreadMessage>
        <ThreadMessage author="Milo" isMilo time="14:04">
          On it. Checking run logs and their ticket history now.
        </ThreadMessage>
        <ThreadMessage author="Milo" isMilo time="14:09">
          Found it: the tip-pool split ran twice for locations 7 and 11. Three
          people affected, $412 total. Write-up with fix steps:
          <span className="mt-2 flex w-fit items-center gap-1.5 rounded-md border bg-background px-2 py-1 font-medium text-xs">
            <FileText className="size-3.5 text-muted-foreground" />
            Payroll run 214: what happened
          </span>
        </ThreadMessage>
      </div>
      <p className="border-t bg-muted/30 px-5 py-2.5 text-muted-foreground text-xs">
        The write-up is a live artifact. Its share link expires, and you can
        revoke it anytime.
      </p>
    </Prop>
  )
}

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
            <span className="rounded-sm bg-muted px-1 py-px font-medium text-[10px] text-muted-foreground">
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
