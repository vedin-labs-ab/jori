import { CircleDot, GitPullRequest, MessageSquare } from "lucide-react"
import { IntegrationLogo } from "@/shared/logo/integration"
import { Mention, Prop } from "../section"

// Each mention prop borrows its platform's signature markers (GitHub's repo
// path and open-issue dot, Linear's issue id and status ring), enough to
// read as that platform at a glance without cloning its UI.
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

export function LinearMention() {
  return (
    <Prop
      label={
        <>
          <IntegrationLogo className="size-3.5" integration="linear" />
          <span className="font-medium text-foreground">Copperline</span>
          <span className="ml-auto">COP</span>
        </>
      }
    >
      <div className="px-5 py-4">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
          <StatusInProgress />
          <span className="text-muted-foreground text-xs tabular-nums">
            COP-73
          </span>
          <span className="font-medium">Tip-pooling certification</span>
        </p>
        <p className="mt-2.5 flex flex-wrap items-center gap-x-1.5 text-sm">
          <Mention /> what's left before this ships?
        </p>
      </div>
    </Prop>
  )
}

// Linear's yellow in-progress ring, approximated.
function StatusInProgress() {
  return (
    <span
      aria-hidden="true"
      className="inline-flex size-3.5 shrink-0 items-center justify-center rounded-full border-[1.5px] border-[#f2c94c]"
    >
      <span className="size-1.5 rounded-full bg-[#f2c94c]" />
    </span>
  )
}

/** A pull request rather than an issue: the ask is review judgement, not
 *  work. GitHub draws open pull requests in the same green as open issues. */
export function ReviewMention() {
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
          <GitPullRequest className="size-3.5 shrink-0 text-[#1a7f37]" />
          <span className="font-medium">Add per-location tip split</span>
          <span className="text-muted-foreground">#512</span>
        </p>
        <p className="mt-2.5 flex flex-wrap items-center gap-x-1.5 text-sm">
          <Mention /> does this need a migration?
        </p>
      </div>
    </Prop>
  )
}

/** Slack has no issue title to anchor on, so the message being answered
 *  stands in for one and the sender takes the identifier's place, which keeps
 *  the card the same two lines as the other three. */
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
