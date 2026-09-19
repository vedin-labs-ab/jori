import { type ReactNode } from "react"
import { ConsolePageLayout } from "../../layout"
import { ConsoleEmptyState, ConsoleListEmpty } from "../../list/empty"
import { ConsoleListLayout } from "../../list/frame"
import { ConsoleListLoading } from "../../list/loading"
import { referencePresentation } from "../../references/presentation"

/** What a material page shows before there is a material to show: the
 *  spinner while its detail query settles, or the reason it never will. A
 *  share fork passes its own fallback, so a visitor holding a share secret
 *  sees the share view where a member would see the refusal. */
export function MaterialPlaceholder({
  fallback,
  message,
  noun,
  status,
}: {
  fallback?: ReactNode
  message?: string
  noun: "file" | "folder" | "store" | "table" | "job" | "conversation"
  status: "loading" | "not_found" | "unauthorized"
}) {
  if (status === "loading") {
    return (
      <ConsolePageLayout>
        <ConsoleListLoading />
      </ConsolePageLayout>
    )
  }

  if (fallback !== undefined) {
    return fallback
  }

  const { icon } = referencePresentation(
    noun === "conversation" ? "chat" : noun,
    ""
  )

  return (
    <ConsoleListLayout>
      <ConsoleListEmpty>
        <ConsoleEmptyState
          description={
            status === "unauthorized"
              ? (message ??
                "Sign in again or switch organizations to try again.")
              : `The ${noun} may have been deleted or belongs to another organization.`
          }
          icon={icon}
          title={
            status === "unauthorized"
              ? `Could not load ${noun}`
              : `${noun[0].toUpperCase()}${noun.slice(1)} not found`
          }
        />
      </ConsoleListEmpty>
    </ConsoleListLayout>
  )
}
