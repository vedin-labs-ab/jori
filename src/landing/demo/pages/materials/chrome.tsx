import { type ReactNode, useContext, useMemo, useState } from "react"
import { FileTitleMenu } from "@/shared/console/files/menu"
import { MaterialTitleMenu } from "@/shared/console/materials/actions/menu"
import { useMaterialBreadcrumb } from "@/shared/console/materials/breadcrumb"
import { ConsoleNavigationContext } from "@/shared/console/shell/location"
import { storeDeleteDescription } from "@/shared/console/stores/list/config"
import { tableDeleteDescription } from "@/shared/console/tables/list/config"
import { TableLead } from "@/shared/console/tables/menu"
import { type TableDetail } from "@/shared/console/tables/types"
import { fileRowOf } from "../../derive/materials"
import { MaterialDialogs, type MaterialRequest } from "../../dialogs/materials"
import {
  type DemoFile,
  type DemoStore,
  type DemoTable,
} from "../../fixtures/types"
import { useDemoWorkspace } from "../../workspace"

/** A table's name in the breadcrumb, with the menu the console gives
 *  one — led by the table's provenance — and the dialogs the menu opens.
 *  A store's or a file's view publishes its own crumb, since its items
 *  lead the menu; those take `CollectionMenu` and `FileMenu`. */
export function CollectionTitle({
  material,
  table,
}: {
  material: DemoTable
  table: TableDetail
}) {
  const [request, setRequest] = useState<MaterialRequest>()

  useMaterialBreadcrumb(
    material.name,
    useMemo(
      () => (
        <CollectionMenu
          lead={<TableLead table={table} />}
          material={material}
          onRequest={setRequest}
        />
      ),
      [material, table]
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
  lead: ReactNode
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

  return (
    <FileTitleMenu
      file={fileRowOf(material)}
      isPending={false}
      lead={lead}
      onOpen={(kind) => onRequest({ kind, material })}
      onDelete={() => {
        actions.removeMaterial(material.id)
        navigation?.navigate("/files")
      }}
    />
  )
}
