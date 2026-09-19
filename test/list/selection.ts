import { type RowSelection } from "../../src/shared/console/list/selection"
import { type SelectionActions } from "../../src/shared/console/list/selection/bar"

export const idleSelectionActions: SelectionActions = {
  isBusy: false,
  noun: { plural: "rows", singular: "row" },
  removal: { description: "", isDestructive: false, label: "Archive" },
}

export function emptySelection<Row>(): RowSelection<Row> {
  return {
    allSelected: false,
    clear: () => undefined,
    count: 0,
    identify: String,
    isSelected: () => false,
    pick: () => undefined,
    replace: () => undefined,
    selected: [],
    toggle: () => undefined,
    toggleAll: () => undefined,
  }
}
