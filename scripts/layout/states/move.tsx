import { ConvexProvider } from "convex/react"
import { getFunctionName } from "convex/server"
import { useEffect, useState } from "react"
import { useMoveConfirmation } from "@/console/folders/move/confirm"
import { demoId } from "@/landing/demo/fixtures/ids"
import { useDemoFolders } from "@/landing/demo/workspace"
import { MoveDialog } from "@/shared/console/folders/dialogs/move"
import { api } from "../../../convex/_generated/api"
import { delay, localService } from "../fixture/service"

/** Actual move dialog and useMoveConfirmation; only query timing/data is local. */
export function MoveState({ state }: { state: string }) {
  const [service] = useState(localService)
  return (
    <ConvexProvider client={service.client}>
      <PendingMove service={service} state={state} />
    </ConvexProvider>
  )
}

function PendingMove({
  service,
  state,
}: {
  service: ReturnType<typeof localService>
  state: string
}) {
  const folders = useDemoFolders()
  const [open, setOpen] = useState(true)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(state === "move-loading")
  const confirmation = useMoveConfirmation("layout-isolated")
  const resourceId = demoId("collections", "layout-0")
  const name = "Customer renewals for regional account operations"
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      <MoveDialog
        folders={loading ? undefined : folders}
        isBusy={busy || confirmation.isResolving}
        onMove={(folderId) => {
          confirmation.request({
            subject: {
              kind: "resource",
              resourceType: "collection",
              resourceId,
            },
            name,
            folderId,
            run: async () => {
              setBusy(true)
              await delay()
              setBusy(false)
              setOpen(false)
            },
          })
          setTimeout(() => {
            service.publish(
              getFunctionName(api.visibility.console.moveAudience),
              {
                losing: state === "move-unchanged" ? 0 : 3,
                gaining: state === "move-unchanged" ? 0 : 8,
                becomesOrganizationWide: false,
              }
            )
          }, 1100)
        }}
        onOpenChange={setOpen}
        subject={
          open
            ? {
                folders: [],
                resources: [{ resourceType: "collection", resourceId, name }],
              }
            : undefined
        }
      />
      {confirmation.dialog}
    </>
  )
}
