import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { PayrollApprovalCard } from "../examples/approval"
import { ModeMatrix } from "../examples/modes"
import { ReceiptsTimeline } from "../examples/receipts"
import { Definition, Section } from "../section"

// The approval story is staged on a mention run: scheduled runs never use
// ask-first tools, so this is the flow where approvals actually happen.
export function Control() {
  return (
    <Section
      className="border-y bg-muted/50"
      lede="Reading your email is a big ask. Milo is built so you never have to take its word for anything."
      title="It works on your terms"
    >
      <div className="grid items-start gap-10 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <div>
          <dl className="space-y-8">
            <Definition term="Permission modes">
              Every action Milo can take has a mode: allowed, ask first, or
              blocked. Sending, posting, changing: you decide which need your
              sign-off.
            </Definition>
            <Definition term="Ask-first approvals">
              Set a tool to ask first and Milo requests before acting, with a
              code you can approve right from the thread. Denied requests never
              run.
            </Definition>
            <Definition term="Receipts for every run">
              Every run records what Milo read, what it did, and what it asked.
              Open any run in the console and check.
            </Definition>
          </dl>
          <Link
            className="mt-8 inline-flex items-center gap-1.5 font-medium text-primary text-sm hover:underline"
            to="/trust"
          >
            How Milo handles access and data
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
        <div className="grid gap-4">
          <ModeMatrix
            label={
              <>
                <span className="font-medium text-foreground">Permissions</span>
                <span>Gmail, GitHub, and web</span>
              </>
            }
            rows={[
              { mode: "allowed", tool: "google_gmail_search_threads" },
              { mode: "prompted", tool: "google_gmail_send_message" },
              { mode: "prompted", tool: "github_create_pull_request" },
              { mode: "blocked", tool: "web_search" },
            ]}
          />
          <PayrollApprovalCard />
          <ReceiptsTimeline
            label={
              <>
                <span className="font-medium text-foreground">
                  Run receipts
                </span>
                <span>#support mention · today</span>
              </>
            }
            receipts={[
              { at: "14:03", step: "Mentioned by Priya in #support" },
              { at: "14:04", step: "Read payroll run logs and tickets" },
              { at: "14:09", step: "Posted the write-up in the thread" },
              { at: "14:10", step: "Requested approval to email Harbor House" },
              { at: "14:26", step: "Approved by Priya" },
              { at: "14:27", step: "Sent. Run complete.", done: true },
            ]}
          />
        </div>
      </div>
    </Section>
  )
}
