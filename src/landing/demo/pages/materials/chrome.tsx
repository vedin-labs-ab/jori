import { type ReactNode, useContext, useMemo, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertDialog } from "@/components/ui/alert-dialog"
import { DropdownMenuContent } from "@/components/ui/dropdown-menu"
import { DeleteFileDialog } from "@/shared/console/files/delete"
import { FileMenuItems } from "@/shared/console/files/menu"
import { ConsolePageLayout } from "@/shared/console/layout"
import { MaterialTitleMenu } from "@/shared/console/materials/actions/menu"
import { useMaterialBreadcrumb } from "@/shared/console/materials/breadcrumb"
import { menuWidth } from "@/shared/console/menu"
import { ConsoleNavigationContext } from "@/shared/console/shell/location"
import { storeDeleteDescription } from "@/shared/console/stores/list/config"
import { tableDeleteDescription } from "@/shared/console/tables/list/config"
import { fileRowOf } from "../../derive/materials"
import { MaterialDialogs, type MaterialRequest } from "../../dialogs/materials"
import {
  type DemoFile,
  type DemoStore,
  type DemoTable,
} from "../../fixtures/types"
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

/** A table's name in the breadcrumb, with the menu the console gives
 *  one, and the dialogs the menu opens. A store's or a file's view
 *  publishes its own crumb, since its items lead the menu; those take
 *  `CollectionMenu` and `FileMenu`. */
export function CollectionTitle({ material }: { material: DemoTable }) {
  const [request, setRequest] = useState<MaterialRequest>()

  useMaterialBreadcrumb(
    material.name,
    useMemo(
      () => <CollectionMenu material={material} onRequest={setRequest} />,
      [material]
    )
  )

  return (
    <MaterialDialogs onClose={() => setRequest(undefined)} request={request} />
  )
}

/** The menu the console hangs off a table's or a store's name. Deleting
 *  leaves for the surface's list, the way the console does. */
export function CollectionMenu({
  lead,
  material,
  onRequest,
}: {
  lead?: ReactNode
  material: DemoStore | DemoTable
  onRequest: (request: MaterialRequest) => void
}) {
  const { actions } = useDemoWorkspace()
  const navigation = useContext(ConsoleNavigationContext)
  const isTable = material.kind === "table"

  return (
    <MaterialTitleMenu
      deleteDescription={
        isTable ? tableDeleteDescription : storeDeleteDescription
      }
      isDeleting={false}
      isRestoring={false}
      lead={lead}
      material={{ name: material.name, archivedAt: undefined }}
      noun={isTable ? "table" : "store"}
      onAccess={() => onRequest({ kind: "access", material })}
      onDelete={() => {
        actions.removeMaterial(material.id)
        navigation?.navigate(isTable ? "/tables" : "/stores")
      }}
      onEdit={() => onRequest({ kind: "edit", material })}
      onMoveToFolder={() => onRequest({ kind: "move", material })}
      onRestore={() => undefined}
    />
  )
}

/** The menu the console hangs off a file's name, less the links the
 *  page's header already carries, led by the view's own lines. Deleting
 *  leaves for the files list, the way the console does. */
export function FileMenu({
  lead,
  material,
  onRequest,
}: {
  lead: ReactNode
  material: DemoFile
  onRequest: (request: MaterialRequest) => void
}) {
  const { actions } = useDemoWorkspace()
  const navigation = useContext(ConsoleNavigationContext)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  return (
    <AlertDialog onOpenChange={setIsDeleteOpen} open={isDeleteOpen}>
      <DropdownMenuContent align="start" className={menuWidth}>
        {lead}
        <FileMenuItems
          file={fileRowOf(material)}
          isPending={false}
          onAccess={() => onRequest({ kind: "access", material })}
          onEdit={() => onRequest({ kind: "edit", material })}
          onMoveToFolder={() => onRequest({ kind: "move", material })}
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
  )
}
