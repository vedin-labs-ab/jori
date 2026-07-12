import { FileText } from "lucide-react"
import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { BrandIcon } from "@/shared/brand"
import { Mention, Prop, Section } from "../section"

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
          <div className="mt-6 space-y-3">
            <MiniMention surface="GitHub · copperline/payroll · Issue #491">
              <Mention /> this test is flaky on CI, can you fix it and open a
              PR?
            </MiniMention>
            <MiniMention surface="Linear · COP-73 · Tip-pooling certification">
              <Mention /> what's left before this ships?
            </MiniMention>
          </div>
        </div>
        <SupportThread />
      </div>
    </Section>
  )
}

function SupportThread() {
  return (
    <Prop
      label={
        <>
          <span className="font-medium text-foreground">#support</span>
          <span>Copperline</span>
          <span className="ml-auto">Slack</span>
        </>
      }
    >
      <div className="space-y-4 px-5 py-4">
        <ThreadMessage author="Priya Nair" initials="PN" time="14:03">
          Harbor House flagged Tuesday's payroll run: tips double-counted at two
          locations. <Mention /> can you pull together what we know?
          <span
            aria-hidden="true"
            className="mt-2 flex w-fit items-center gap-1 rounded-full border bg-muted/50 px-2 py-0.5 text-xs"
          >
            👀 <span className="tabular-nums">1</span>
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
          "flex size-7 shrink-0 items-center justify-center rounded-md",
          isMilo
            ? undefined
            : "bg-secondary font-medium text-secondary-foreground text-xs"
        )}
      >
        {isMilo ? <BrandIcon className="size-7" /> : initials}
      </span>
      <div className="min-w-0">
        <p className="flex items-baseline gap-2 text-xs">
          <span className="font-medium text-sm">{author}</span>
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

function MiniMention({
  children,
  surface,
}: {
  children: ReactNode
  surface: string
}) {
  return (
    <div className="rounded-lg border px-4 py-3">
      <p className="text-muted-foreground text-xs">{surface}</p>
      <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-sm">
        {children}
      </p>
    </div>
  )
}
