import { type ReactNode } from "react"
import { ConsoleListToolbar } from "../shared/list/frame"

/** Secondary header under the console breadcrumb, shared by the file
 *  editor and viewer: quiet file meta on the left, contextual actions on
 *  the right, constant height either way. */
export function FileToolbar({
  action,
  children,
}: {
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <ConsoleListToolbar className="flex-nowrap gap-x-3 py-2">
      <div className="flex min-h-7 min-w-0 flex-1 items-center">{children}</div>
      {action === undefined ? null : (
        <div className="flex shrink-0 items-center gap-1.5">{action}</div>
      )}
    </ConsoleListToolbar>
  )
}
