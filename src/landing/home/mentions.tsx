import { CircleDot } from "lucide-react"
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
