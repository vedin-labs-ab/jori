import { LayoutGrid, Play, Search, Send } from "lucide-react"
import { ReleaseApprovalCard } from "../examples/approval"
import { ReceiptsTimeline } from "../examples/receipts"
import { Section } from "../section"

export function ApprovalsSection() {
  return (
    <Section
      className="border-y bg-muted/50"
      lede="Set a tool to ask first and Jori requests before acting. Nothing runs until you approve it."
      title="Ask first means ask you"
    >
      <div className="grid items-start gap-10 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <div className="space-y-5 text-muted-foreground text-sm leading-relaxed">
          <p className="max-w-xl">
            Every request carries a code. Approve it from the console, or reply
            where the work is: type approve YD4UEFNV in the thread and the
            action runs. Deny it, or let it expire, and it never does. Jori
            doesn't retry on its own.
          </p>
          <p className="max-w-xl">
            Unattended runs can never use ask-first tools. Anything you gate
            waits for a run with you in it.
          </p>
        </div>
        <ReleaseApprovalCard />
      </div>
    </Section>
  )
}

export function ReceiptsSection() {
  return (
    <Section
      lede="What Jori read, what it did, what it asked: timestamped, on every run."
      title="Every run keeps receipts"
    >
      <div className="grid items-start gap-10 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <div className="space-y-5 text-muted-foreground text-sm leading-relaxed">
          <p className="max-w-xl">
            Runs live in the console: what triggered them, which tools they
            used, what they produced, and what they asked along the way. When
            Jori splits work into subtasks, each one links back to the run that
            started it.
          </p>
          <p className="max-w-xl">
            Receipts aren't a report Jori writes about itself. They're the
            record of what actually ran.
          </p>
        </div>
        <ReceiptsTimeline
          label={
            <>
              <span className="font-medium text-foreground">Run receipts</span>
              <span>Release readiness · today</span>
            </>
          }
          receipts={[
            {
              at: "07:58",
              detail: "Weekday mornings",
              duration: "0s",
              icon: Play,
              source: "Schedule",
              step: "Started on schedule",
              surface: "jori",
            },
            {
              at: "07:58",
              detail: "copperline/payroll, 9 open",
              duration: "4s",
              icon: Search,
              source: "GitHub",
              step: "Read pull requests",
              surface: "github",
            },
            {
              at: "07:59",
              detail: "Copperline and Platform, 14 issues",
              duration: "6s",
              icon: Search,
              source: "Linear",
              step: "Read issues",
              surface: "linear",
            },
            {
              at: "07:59",
              detail: "2 blocking, 11 ready, 1 in review",
              duration: "2s",
              icon: LayoutGrid,
              source: "Release readiness",
              step: "Updated the app",
              surface: "jori",
            },
            {
              at: "08:00",
              detail: "#eng, what changed since yesterday",
              duration: "1s",
              icon: Send,
              source: "Slack",
              step: "Posted the change",
              surface: "slack",
            },
          ]}
        />
      </div>
    </Section>
  )
}
