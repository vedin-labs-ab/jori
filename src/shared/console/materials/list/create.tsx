import { Button } from "@/components/ui/button"
import { FilterableEmptyState } from "../../list/empty"
import { MenuItem } from "../../menu/items"
import { type MaterialCreate, type MaterialListKind } from "./types"

/** The page's create actions as a right-click on the list's background
 *  offers them. */
export function MaterialCreateItems({
  creates,
}: {
  creates: readonly MaterialCreate[]
}) {
  return creates.map((create) => (
    <MenuItem key={create.label} onSelect={create.onSelect}>
      <create.icon />
      {create.label}
    </MenuItem>
  ))
}

/** The same actions as buttons, under the copy that introduces the kind
 *  or asks for wider filters. */
export function MaterialEmptyState<Row>({
  hasFilters,
  kind,
}: {
  hasFilters: boolean
  kind: MaterialListKind<Row>
}) {
  return (
    <FilterableEmptyState
      action={
        <div className="flex flex-wrap items-center justify-center gap-2">
          {kind.creates.map((create, index) => (
            <Button
              key={create.label}
              onClick={create.onSelect}
              type="button"
              variant={index === 0 ? "default" : "outline"}
            >
              <create.icon />
              {create.label}
            </Button>
          ))}
        </div>
      }
      description={kind.description}
      hasFilters={hasFilters}
      icon={kind.icon}
      noun={kind.noun.plural}
    />
  )
}
