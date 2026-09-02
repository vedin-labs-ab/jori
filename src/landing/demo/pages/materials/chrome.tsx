import { type ReactNode, useContext, useMemo, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertDialog } from "@/components/ui/alert-dialog"
import { DropdownMenuContent } from "@/components/ui/dropdown-menu"
import { DeleteFileDialog } from "@/shared/console/files/delete"
import { FileMenuItems } from "@/shared/console/files/menu"
import { ConsolePageLayout } from "@/shared/console/layout"
import { MaterialTitleMenu } from "@/shared/console/materials/actions/menu"
import {
  type MaterialBreadcrumb,
  useMaterialTrail,
} from "@/shared/console/materials/breadcrumb"
import { menuWidth } from "@/shared/console/menu"
import { ConsoleNavigationContext } from "@/shared/console/shell/location"
import { storeDeleteDescription } from "@/shared/console/stores/list/config"
import { tableDeleteDescription } from "@/shared/console/tables/list/config"
import { folderOf, folderTrail } from "../../derive/folders"
import { fileRowOf } from "../../derive/materials"
import { MaterialDialogs, type MaterialRequest } from "../../dialogs/materials"
import {
  type DemoFile,
  type DemoMaterial,
  type DemoStore,
  type DemoTable,
} from "../../fixtures/types"
import { type DemoState } from "../../state/types"
import { useDemoWorkspace } from "../../workspace"

// What every material page shares with the console's: the crumb that says
// where the material lives, the menu the console hangs off its name, and
// the alert for a material the workspace no longer has.

/** The console's alert for a material that is gone. */
export function MaterialMissing({
  noun,
}: {
  noun: "file" | "store" | "table"
}) {
  return (
    <ConsolePageLayout>
      <Alert>
        <AlertTitle>
          {noun === "file" ? "File" : noun === "store" ? "Store" : "Table"} not
          found
        </AlertTitle>
        <AlertDescription>
          The {noun} may have been deleted or belongs to another organization.
        </AlertDescription>
      </Alert>
    </ConsolePageLayout>
  )
}

/** A table's or a store's name in the breadcrumb, with the menu the
 *  console gives one, and the dialogs the menu opens. Deleting leaves
 *  for the surface's list, the way the console does. */
export function CollectionTitle({
  material,
}: {
  material: DemoStore | DemoTable
}) {
  const { actions } = useDemoWorkspace()
  const navigation = useContext(ConsoleNavigationContext)
  const [request, setRequest] = useState<MaterialRequest>()
  const isTable = material.kind === "table"

  useMaterialCrumb(
    material,
    useMemo(
      () => (
        <MaterialTitleMenu
          deleteDescription={
            isTable ? tableDeleteDescription : storeDeleteDescription
          }
          isDeleting={false}
          isRestoring={false}
          material={{ name: material.name, archivedAt: undefined }}
          noun={isTable ? "table" : "store"}
          onAccess={() => setRequest({ kind: "access", material })}
          onDelete={() => {
            actions.removeMaterial(material.id)
            navigation?.navigate(isTable ? "/tables" : "/stores")
          }}
          onEdit={() => setRequest({ kind: "edit", material })}
          onMoveToFolder={() => setRequest({ kind: "move", material })}
          onRestore={() => undefined}
        />
      ),
      [actions, isTable, material, navigation]
    )
  )

  return (
    <MaterialDialogs onClose={() => setRequest(undefined)} request={request} />
  )
}

/** A file's name in the breadcrumb, with the file menu less the links the
 *  page's header already carries, and the dialogs the menu opens. */
export function FileTitle({ material }: { material: DemoFile }) {
  const { actions } = useDemoWorkspace()
  const navigation = useContext(ConsoleNavigationContext)
  const [request, setRequest] = useState<MaterialRequest>()
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  useMaterialCrumb(
    material,
    useMemo(
      () => (
        <AlertDialog onOpenChange={setIsDeleteOpen} open={isDeleteOpen}>
          <DropdownMenuContent align="start" className={menuWidth}>
            <FileMenuItems
              file={fileRowOf(material)}
              isPending={false}
              onAccess={() => setRequest({ kind: "access", material })}
              onEdit={() => setRequest({ kind: "edit", material })}
              onMoveToFolder={() => setRequest({ kind: "move", material })}
              onRemove={() => setIsDeleteOpen(true)}
              withLinks={false}
            />
          </DropdownMenuContent>
          <DeleteFileDialog
            file={material}
            isPending={false}
            onDelete={() => {
              actions.removeMaterial(material.id)
              navigation?.navigate("/files")
            }}
          />
        </AlertDialog>
      ),
      [actions, isDeleteOpen, material, navigation]
    )
  )

  return (
    <MaterialDialogs onClose={() => setRequest(undefined)} request={request} />
  )
}

/** Publishes the material's crumb with the menu hung off its name. */
function useMaterialCrumb(material: DemoMaterial, menu: ReactNode) {
  const { state } = useDemoWorkspace()

  useMaterialTrail(
    useMemo(
      () => ({ ...materialCrumb(state, material), menu }),
      [material, menu, state]
    )
  )
}

/** The material's crumb: its folder's own trail when it is filed, so the
 *  page says where the material lives, and the surface's otherwise. */
function materialCrumb(
  state: DemoState,
  material: DemoMaterial
): MaterialBreadcrumb {
  const folder =
    material.folderId === undefined
      ? undefined
      : folderOf(state, material.folderId)

  return {
    name: material.name,
    ...(folder === undefined
      ? {}
      : {
          trail: folderTrail(state, folder).map((segment) => ({
            name: segment.name,
            params: { folderId: segment.folderId },
            to: "/folders/$folderId",
          })),
        }),
  }
}
