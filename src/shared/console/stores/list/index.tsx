import { Database, Plus } from "lucide-react"
import { type ComponentProps } from "react"
import { Button } from "@/components/ui/button"
import { type ResourceDragItem } from "@/shared/console/folders/drag/plan"
import {
  ConsoleHeaderActions,
  ConsoleHeaderButton,
  ConsoleSearch,
} from "@/shared/console/layout"
import {
  type MaterialListActions,
  materialRowMenu,
} from "@/shared/console/materials/actions/list"
import {
  materialColumns,
  measureColumn,
} from "@/shared/console/materials/cells/columns"
import { MaterialList } from "@/shared/console/materials/list"
import { type StoreSummary } from "../types"
import { StoreNameCell, StorePropertiesCell, StoreVersionCell } from "./cells"
import { storeDeleteDescription, storeNoun } from "./config"

export function StoresToolbar({
  onCreate,
  onQueryChange,
  query,
}: {
  onCreate: () => void
  onQueryChange: (query: string) => void
  query: string
}) {
  return (
    <ConsoleHeaderActions>
      <ConsoleSearch
        label="Search stores"
        onValueChange={onQueryChange}
        value={query}
      />
      <ConsoleHeaderButton
        icon={<Plus />}
        data-create-kind="store"
        label="New store"
        onClick={onCreate}
        type="button"
      />
    </ConsoleHeaderActions>
  )
}

const identify = (store: StoreSummary) => store.storeId

const drag = (store: StoreSummary): ResourceDragItem => ({
  type: "store",
  id: store.storeId,
  name: store.name,
  folderId: store.folderId,
})

const columns = materialColumns<StoreSummary>([
  measureColumn(
    "Properties",
    "properties",
    (store) => <StorePropertiesCell store={store} />,
    "2xl"
  ),
  measureColumn(
    "Version",
    "version",
    (store) => <StoreVersionCell store={store} />,
    "2xl"
  ),
])

export function StoreList({
  onAccess,
  onCreate,
  onEdit,
  onMoveToFolder,
  removal,
  stores,
  ...props
}: Omit<ComponentProps<typeof MaterialList<StoreSummary>>, "kind" | "rows"> &
  MaterialListActions<StoreSummary> & {
    onCreate: () => void
    stores: StoreSummary[]
  }) {
  return (
    <MaterialList
      {...props}
      kind={{
        creationKind: "store",
        createdRow: (item) => item.store,
        action: (
          <Button onClick={onCreate} type="button">
            <Plus />
            New store
          </Button>
        ),
        columns,
        description:
          "JSON documents Jori and your team keep state in appear here.",
        drag,
        icon: Database,
        identify,
        menu: materialRowMenu(
          {
            deleteDescription: storeDeleteDescription,
            identify,
            noun: storeNoun.singular,
          },
          { onAccess, onEdit, onMoveToFolder, removal }
        ),
        nameCell: (store) => <StoreNameCell store={store} />,
        noun: storeNoun,
      }}
      rows={stores}
    />
  )
}
