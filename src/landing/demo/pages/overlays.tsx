import { type ReactNode, useState } from "react"
import { toast } from "sonner"
import { type CountedNoun } from "@/shared/console/count"
import {
  type MoveResourceTarget,
  resourceSubject,
} from "@/shared/console/folders/types"
import { ConsoleListFooter } from "@/shared/console/list/frame"
import { ConsoleListPager } from "@/shared/console/list/pager"
import { type useClientPagination } from "@/shared/console/list/pagination"
import { type RowSelection } from "@/shared/console/list/selection"
import { type SelectionActions } from "@/shared/console/list/selection/bar"
import {
  bulkMaterialRemoval,
  bulkMaterialRemovalSuccess,
} from "@/shared/console/materials/removal"
import { closeOnDismiss } from "@/shared/console/retain"
import { materialMoveTarget } from "../derive/materials"
import { MaterialDialogs, type MaterialRequest } from "../dialogs/materials"
import { DemoMoveDialog } from "../dialogs/move"
import { type DemoMaterial } from "../fixtures/types"
import { useDemoWorkspace } from "../workspace"

/** Everything below and over a material list: the pager and the row menus'
 *  dialogs, beside the selection's move and remove for the list to offer. */
export function useMaterialListOverlays<
  Row extends { archivedAt?: number; name: string },
>({
  deleteDescription,
  identify,
  noun,
  onCloseRequest,
  pagination,
  request,
  selection,
  toMaterial,
}: {
  deleteDescription: string
  identify: (row: Row) => string
  noun: CountedNoun
  onCloseRequest: () => void
  pagination: ReturnType<typeof useClientPagination<Row>>
  request: MaterialRequest | undefined
  selection: RowSelection<Row>
  toMaterial: (row: Row) => DemoMaterial | undefined
}): { overlays: ReactNode; selectionActions: SelectionActions } {
  const { actions } = useDemoWorkspace()
  const [moving, setMoving] = useState<MoveResourceTarget[]>()

  const selectionActions: SelectionActions = {
    isBusy: false,
    noun,
    onMove: () =>
      setMoving(
        selection.selected.flatMap((row) => {
          const material = toMaterial(row)

          return material === undefined ? [] : [materialMoveTarget(material)]
        })
      ),
    onRemove: () => {
      for (const row of selection.selected) {
        actions.removeMaterial(identify(row))
      }

      toast.success(bulkMaterialRemovalSuccess(selection.selected, noun))
    },
    removal: bulkMaterialRemoval(
      selection.selected.map(() => ({})),
      noun,
      deleteDescription
    ),
  }
  const overlays = (
    <>
      <ConsoleListFooter>
        <ConsoleListPager pagination={pagination} />
      </ConsoleListFooter>
      <DemoMoveDialog
        onOpenChange={closeOnDismiss(() => setMoving(undefined))}
        subject={
          moving === undefined || moving.length === 0
            ? undefined
            : resourceSubject(moving)
        }
      />
      <MaterialDialogs onClose={onCloseRequest} request={request} />
    </>
  )

  return { overlays, selectionActions }
}
