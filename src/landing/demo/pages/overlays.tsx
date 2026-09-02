import { type ReactNode, useState } from "react"
import { toast } from "sonner"
import { type CountedNoun } from "@/shared/console/count"
import { type MoveResourceTarget } from "@/shared/console/folders/types"
import { SelectionActionsBar } from "@/shared/console/list/bar"
import { ConsoleListFooter } from "@/shared/console/list/frame"
import { ConsoleListPager } from "@/shared/console/list/pager"
import { type useClientPagination } from "@/shared/console/list/pagination"
import { type RowSelection } from "@/shared/console/list/selection"
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

/** Everything below and over a material list: the pager, the selection
 *  bar's move and remove, the row menus' dialogs, and the create dialog
 *  the page brings. */
export function MaterialListOverlays<
  Row extends { archivedAt?: number; name: string },
>({
  create,
  deleteDescription,
  identify,
  noun,
  onCloseRequest,
  pagination,
  request,
  selection,
  toMaterial,
}: {
  create: ReactNode
  deleteDescription: string
  identify: (row: Row) => string
  noun: CountedNoun
  onCloseRequest: () => void
  pagination: ReturnType<typeof useClientPagination<Row>>
  request: MaterialRequest | undefined
  selection: RowSelection<Row>
  toMaterial: (row: Row) => DemoMaterial | undefined
}) {
  const { actions } = useDemoWorkspace()
  const [moving, setMoving] = useState<MoveResourceTarget[]>()

  return (
    <>
      <ConsoleListFooter>
        <ConsoleListPager pagination={pagination} />
      </ConsoleListFooter>
      <SelectionActionsBar
        count={selection.count}
        isBusy={false}
        noun={noun}
        onClear={selection.clear}
        onMove={() =>
          setMoving(
            selection.selected.flatMap((row) => {
              const material = toMaterial(row)

              return material === undefined
                ? []
                : [materialMoveTarget(material)]
            })
          )
        }
        onRemove={() => {
          for (const row of selection.selected) {
            actions.removeMaterial(identify(row))
          }

          toast.success(bulkMaterialRemovalSuccess(selection.selected, noun))
        }}
        removal={bulkMaterialRemoval(
          selection.selected.map(() => ({})),
          noun,
          deleteDescription
        )}
      />
      <DemoMoveDialog
        onOpenChange={closeOnDismiss(() => setMoving(undefined))}
        subject={
          moving === undefined || moving.length === 0
            ? undefined
            : { kind: "resources", resources: moving }
        }
      />
      <MaterialDialogs onClose={onCloseRequest} request={request} />
      {create}
    </>
  )
}
