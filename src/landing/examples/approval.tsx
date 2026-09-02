import { buttonVariants } from "@/components/ui/button"
import { ProviderLogo } from "@/shared/logo/provider"
import { Prop } from "../section"

const lines = [
  "On: COP-73 · Tip-pooling certification",
  "Asking Jonas which two signatures are missing",
  "Posted as you",
]

/** An ask-first request as the requester sees it: what would run, on whose
 *  behalf, with the decision still theirs. One composed instance, shared by
 *  the home and trust pages, so the story stays identical in both places. */
export function ReleaseApprovalCard() {
  return (
    <Prop
      label={
        <>
          <span className="font-medium text-foreground">
            Approval requested
          </span>
          <span>#eng · Slack</span>
        </>
      }
    >
      <div className="px-5 py-4">
        <p className="flex items-center gap-2 font-medium text-sm">
          <ProviderLogo className="size-4" surface="linear" />
          Comment on the certification issue
        </p>
        <ul className="mt-3 space-y-1.5 text-muted-foreground text-xs">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        <div aria-hidden="true" className="mt-4 flex gap-2">
          <span className={buttonVariants({ size: "default" })}>Approve</span>
          <span className={buttonVariants({ variant: "outline" })}>Deny</span>
        </div>
      </div>
      {/* The code is the thread's own way to answer, so it sits with the
          request rather than in the prose beside it. */}
      <p className="border-t bg-muted/30 px-5 py-2.5 text-muted-foreground text-xs">
        Or reply in the thread:{" "}
        <code className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[0.9em] text-foreground">
          approve YD4UEFNV
        </code>
      </p>
    </Prop>
  )
}
