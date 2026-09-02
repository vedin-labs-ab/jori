import { useQuery } from "convex/react"
import { type FunctionArgs } from "convex/server"
import { type GenericId } from "convex/values"
import { type ReactNode, useEffect, useState } from "react"
import { type FiledResourceType } from "@/shared/console/folders/types"
import { api } from "../../../../convex/_generated/api"
import { type AudienceChange, MovePrompt } from "./prompt"

// Moving changes who can see a resource, and the folder it lands in is not
// where that shows. Every console move asks first when the audience moves
// with it, in either direction, and stays out of the way when it does not.
// A folder asks for its contents too: the chain it re-parents into cascades
// over everything filed inside it.

type MoveAudienceArgs = FunctionArgs<typeof api.visibility.console.moveAudience>

/** What a surface hands over to be moved. Ids stay plain strings here and
 *  are branded once, on the way into the query. */
type MovedSubject =
  | { kind: "resource"; resourceType: FiledResourceType; resourceId: string }
  | { kind: "folder"; folderId: string }

export type PendingMove = {
  subject: MovedSubject
  name: string
  /** Where it would land: a folder, or null for the top level. */
  folderId: string | null
  /** The move itself, run once nothing — or nobody — stands in its way. */
  run: () => Promise<void>
  /** Ran instead when the person declines the move. */
  decline?: () => void
}

export type MoveConfirmation = {
  dialog: ReactNode
  /** True while the comparison is in flight. A surface holds its trigger
   *  down until the answer decides between moving and asking, so one click
   *  cannot become two moves. */
  isResolving: boolean
  /** Takes the move, or refuses it — false — while another is still
   *  waiting on its answer: taking a second one would drop the first move
   *  on the floor. */
  request: (move: PendingMove) => boolean
}

/** Wraps one moving surface: hand it the move, render its dialog. */
export function useMoveConfirmation(
  organizationId: string | undefined
): MoveConfirmation {
  const [pending, setPending] = useState<PendingMove>()
  const change = useQuery(
    api.visibility.console.moveAudience,
    pending === undefined || organizationId === undefined
      ? "skip"
      : {
          organizationId,
          subject: querySubject(pending.subject),
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
    isResolving: pending !== undefined && change === undefined,
    request: (move: PendingMove) => {
      if (organizationId === undefined) {
        void move.run()

        return true
      }

      if (pending !== undefined) {
        return false
      }

      setPending(move)

      return true
    },
    dialog:
      pending === undefined || change === undefined || !asks(change) ? null : (
        <MovePrompt
          change={change}
          kind={pending.subject.kind}
          name={pending.name}
          onCancel={() => {
            setPending(undefined)
            pending.decline?.()
          }}
          onConfirm={() => {
            setPending(undefined)
            void pending.run()
          }}
        />
      ),
  }
}

function querySubject(subject: MovedSubject): MoveAudienceArgs["subject"] {
  return subject.kind === "folder"
    ? { kind: "folder", folderId: subject.folderId as GenericId<"folders"> }
    : subject
}

/** A move worth confirming: somebody joins the audience or drops out of it.
 *  A subject the caller cannot see answers null, and the mutation is left
 *  to refuse it. */
function asks(change: AudienceChange | null): change is AudienceChange {
  return change !== null && (change.losing > 0 || change.gaining > 0)
}
