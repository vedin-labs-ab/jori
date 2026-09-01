import { useQuery } from "convex/react"
import { type FunctionArgs } from "convex/server"
import { type GenericId } from "convex/values"
import { useEffect, useState } from "react"
import { api } from "../../../../convex/_generated/api"
import { type AudienceChange, FilingPrompt } from "./prompt"

// Filing changes who can see a resource, and the folder it lands in is not
// where that shows. Every console move asks first when the audience moves
// with it, in either direction, and stays out of the way when it does not.

type MoveAudienceArgs = FunctionArgs<typeof api.visibility.console.moveAudience>

export type PendingFiling = {
  resourceType: MoveAudienceArgs["resourceType"]
  resourceId: string
  name: string
  folderId: string | null
  /** The move itself, run once nothing — or nobody — stands in its way. */
  run: () => Promise<void>
}

/** Wraps one filing surface: hand it the move, render its dialog. */
export function useFilingConfirmation(organizationId: string | undefined) {
  const [pending, setPending] = useState<PendingFiling>()
  const change = useQuery(
    api.visibility.console.moveAudience,
    pending === undefined || organizationId === undefined
      ? "skip"
      : {
          organizationId,
          resourceType: pending.resourceType,
          resourceId: pending.resourceId,
          folderId: pending.folderId as GenericId<"folders"> | null,
        }
  )

  // An unchanged audience is nothing to ask about, so the move goes through
  // the moment the answer says so.
  useEffect(() => {
    if (pending === undefined || change === undefined || asks(change)) {
      return
    }

    setPending(undefined)
    void pending.run()
  }, [change, pending])

  return {
    request: (filing: PendingFiling) => {
      if (organizationId === undefined) {
        void filing.run()
      } else {
        setPending(filing)
      }
    },
    dialog:
      pending === undefined || change === undefined || !asks(change) ? null : (
        <FilingPrompt
          change={change}
          name={pending.name}
          onCancel={() => setPending(undefined)}
          onConfirm={() => {
            setPending(undefined)
            void pending.run()
          }}
        />
      ),
  }
}

/** A move worth confirming: somebody joins the audience or drops out of it.
 *  A resource the caller cannot see answers null, and the mutation is left
 *  to refuse it. */
function asks(change: AudienceChange | null): change is AudienceChange {
  return change !== null && (change.losing > 0 || change.gaining > 0)
}
