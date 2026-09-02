import { type ReactNode } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ConsolePageLayout } from "../layout"
import { ConsoleListLoading } from "../list/loading"

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
  noun: string
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

  return (
    <ConsolePageLayout>
      {status === "unauthorized" ? (
        <Alert variant="destructive">
          <AlertTitle>Could not load {noun}</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <AlertTitle>
            {noun[0].toUpperCase()}
            {noun.slice(1)} not found
          </AlertTitle>
          <AlertDescription>
            The {noun} may have been deleted or belongs to another organization.
          </AlertDescription>
        </Alert>
      )}
    </ConsolePageLayout>
  )
}
