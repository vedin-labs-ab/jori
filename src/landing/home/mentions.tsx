import { CircleDot, MessageSquare } from "lucide-react"
import { IntegrationLogo } from "@/shared/logo/integration"
import { Mention, Prop } from "../section"

// Each mention prop borrows its platform's signature markers (GitHub's repo
// path and open-issue dot), enough to read as that platform at a glance
// without cloning its UI.
//
// Two, and deliberately two. Four cards spent the page's least differentiated
// claim four times over, and three of them were the same question wearing
// different chrome. What is left is one ask for work and one ask for
// judgement, which is the whole range.
export function GitHubMention() {
  return (
    <Prop
      label={
        <>
          <IntegrationLogo className="size-3.5" integration="github" />
          <span className="font-medium text-foreground">
            copperline/payroll
          </span>
        </>
      }
    >
      <div className="px-5 py-4">
        <p className="flex flex-wrap items-center gap-x-1.5 text-sm">
          <CircleDot className="size-3.5 shrink-0 text-[#1a7f37]" />
          <span className="font-medium">Payroll sync test is flaky on CI</span>
          <span className="text-muted-foreground">#491</span>
        </p>
        <p className="mt-2.5 flex flex-wrap items-center gap-x-1.5 text-sm">
          <Mention /> can you fix this and open a PR?
        </p>
      </div>
    </Prop>
  )
}

/** Slack has no issue title to anchor on, so the message being answered
 *  stands in for one and the sender takes the identifier's place, which keeps
 *  the card the same two lines as the other. */
export function SlackMention() {
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
      <div className="px-5 py-4">
        <p className="flex flex-wrap items-center gap-x-1.5 text-sm">
          <MessageSquare className="size-3.5 shrink-0 text-muted-foreground" />
          <span className="text-muted-foreground">Priya Nair</span>
          <span className="font-medium">
            Tips double-counted at Harbor House
          </span>
        </p>
        {/* Indented under the sender, the way Slack stacks a second line from
            the same person, so the ask reads as Priya's rather than as an
            unnamed someone answering her. */}
        <p className="mt-2.5 ml-5 flex flex-wrap items-center gap-x-1.5 text-sm">
          <Mention /> have we seen this before?
        </p>
      </div>
    </Prop>
  )
}
