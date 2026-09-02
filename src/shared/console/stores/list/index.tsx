import { Database, Plus } from "lucide-react"
import { type ComponentProps } from "react"
import { Button } from "@/components/ui/button"
import {
  ConsoleHeaderActions,
  ConsoleHeaderButton,
  ConsoleSearch,
} from "@/shared/console/layout"
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
        label="New store"
        onClick={onCreate}
        type="button"
      />
    </ConsoleHeaderActions>
  )
}

export function StoreList({
  onCreate,
  stores,
  ...props
}: Omit<ComponentProps<typeof MaterialList<StoreSummary>>, "kind" | "rows"> & {
  onCreate: () => void
  stores: StoreSummary[]
}) {
  return (
    <MaterialList
      {...props}
      kind={{
        action: (
          <Button onClick={onCreate} type="button">
            <Plus />
            New store
          </Button>
        ),
        deleteDescription: storeDeleteDescription,
        description:
          "JSON documents Jori and your team keep state in appear here.",
        icon: Database,
        identify: (store) => store.storeId,
        measures: [
          {
            cell: (store) => <StorePropertiesCell store={store} />,
            label: "Properties",
            sortKey: "properties",
          },
          {
            cell: (store) => <StoreVersionCell store={store} />,
            label: "Version",
            sortKey: "version",
          },
        ],
        nameCell: (store) => <StoreNameCell store={store} />,
        noun: storeNoun,
      }}
      rows={stores}
    />
  )
}
