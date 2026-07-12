import { FileText } from "lucide-react"
import { type ReactNode } from "react"
import { buttonVariants } from "@/components/ui/button"
import { Prop } from "../section"

/** An ask-first request as the requester sees it: what would run, on whose
 *  behalf, with the decision still theirs. */
export function ApprovalCard({
  attachment,
  label,
  lines,
  title,
}: {
  attachment?: string
  label: ReactNode
  lines: readonly string[]
  title: string
}) {
  return (
    <Prop label={label}>
      <div className="px-5 py-4">
        <p className="font-medium text-sm">{title}</p>
        <ul className="mt-3 space-y-1.5 text-muted-foreground text-xs">
          {lines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
        {attachment === undefined ? null : (
          <p className="mt-3 flex w-fit items-center gap-1.5 rounded-md border bg-background px-2 py-1 font-medium text-xs">
            <FileText className="size-3.5 text-muted-foreground" />
            {attachment}
          </p>
        )}
        <div aria-hidden="true" className="mt-4 flex gap-2">
          <span className={buttonVariants({ size: "default" })}>Approve</span>
          <span className={buttonVariants({ variant: "outline" })}>Deny</span>
        </div>
      </div>
    </Prop>
  )
}
