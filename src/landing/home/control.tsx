import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { ReleaseApprovalCard } from "../examples/approval"
import { ModeMatrix } from "../examples/modes"
import { Definition, Section } from "../section"

// The approval story is staged on a mention run: scheduled runs never use
// ask-first tools, so this is the flow where approvals actually happen.
export function Control() {
  return (
    <Section
      className="border-y bg-muted/50"
      lede="Handing over real work means handing over real access. Milo is built so you never have to take its word for anything."
      title="It works on your terms"
    >
      <div className="grid items-start gap-10 md:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
        <div>
          <dl className="space-y-8">
            <Definition term="Permission modes">
              Every action Milo can take has a mode: allowed, ask first, or
              blocked. Posting, commenting, changing: you decide which need your
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
            className="mt-7 inline-flex items-center gap-1.5 py-1 font-medium text-primary text-sm hover:underline"
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
                <span>GitHub, Linear, and web</span>
              </>
            }
            rows={[
              { mode: "allowed", tool: "github_search_issues" },
              { mode: "prompted", tool: "linear_add_comment" },
              { mode: "prompted", tool: "github_create_pull_request" },
              { mode: "blocked", tool: "web_search" },
            ]}
          />
          <ReleaseApprovalCard />
        </div>
      </div>
    </Section>
  )
}
