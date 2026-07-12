import { ApprovalCard } from "../props/approval"
import { ReceiptsTimeline } from "../props/receipts"
import { Section } from "../section"

export function ApprovalsSection() {
  return (
    <Section
      className="border-y bg-muted/50"
      lede="Set a tool to ask first and Milo requests before acting. Nothing runs until you approve it."
      title="Ask first means ask you"
    >
      <div className="grid items-start gap-10 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <div className="space-y-5 text-muted-foreground text-sm leading-relaxed">
          <p className="max-w-xl">
            Every request carries a code. Approve it from the console, or reply
            where the work is: type approve YD4UEFNV in the thread and the
            action runs. Deny it, or let it expire, and it never does. Milo
            doesn't retry on its own.
          </p>
          <p className="max-w-xl">
            Unattended runs can never use ask-first tools. Anything you gate
            waits for a run with you in it.
          </p>
        </div>
        <ApprovalCard
          attachment="Payroll run 214: what happened"
          label={
            <>
              <span className="font-medium text-foreground">
                Approval requested
              </span>
              <span>#support · Slack</span>
            </>
          }
          lines={[
            "To: Dan Okafor · Harbor House Group",
            "Re: Tuesday's payroll run",
            "Sent from your Gmail",
          ]}
          surface="gmail"
          title="Email Dan Okafor the payroll fix summary"
        />
      </div>
    </Section>
  )
}

export function ReceiptsSection() {
  return (
    <Section
      lede="What Milo read, what it did, what it asked: timestamped, on every run."
      title="Every run keeps receipts"
    >
      <div className="grid items-start gap-10 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <div className="space-y-5 text-muted-foreground text-sm leading-relaxed">
          <p className="max-w-xl">
            Runs live in the console: what triggered them, which tools they
            used, what they produced, and what they asked along the way. When
            Milo splits work into subtasks, each one links back to the run that
            started it.
          </p>
          <p className="max-w-xl">
            Receipts aren't a report Milo writes about itself. They're the
            record of what actually ran.
          </p>
        </div>
        <ReceiptsTimeline
          label={
            <>
              <span className="font-medium text-foreground">Run receipts</span>
              <span>Morning brief · weekdays</span>
            </>
          }
          receipts={[
            { at: "07:58", step: "Started on schedule" },
            { at: "07:58", step: "Read calendar: 3 meetings today" },
            { at: "07:59", step: "Searched Gmail: 14 open threads" },
            { at: "07:59", step: "Wrote the brief" },
            {
              at: "08:00",
              step: "Emailed it to you. Run complete.",
              done: true,
            },
          ]}
        />
      </div>
    </Section>
  )
}
