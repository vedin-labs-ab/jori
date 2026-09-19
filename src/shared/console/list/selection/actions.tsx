import { type ReactNode, useState } from "react"
import { type RowSelection } from "."
import {
  type SelectionActions,
  SelectionActionsBar,
  SelectionMenuItems,
} from "./bar"

/** A list's selection, offered two ways over one confirmation: the dock,
 *  and the menu a right-click on one of several selected rows opens. */
export function useSelectionActions<Row>(
  selection: RowSelection<Row>,
  actions: SelectionActions
): { dock: ReactNode; menu: ReactNode } {
  const [isConfirming, setIsConfirming] = useState(false)

  return {
    dock: (
      <SelectionActionsBar
        {...actions}
        confirming={{ isOpen: isConfirming, onOpenChange: setIsConfirming }}
        count={selection.count}
        onClear={selection.clear}
      />
    ),
    menu: (
      <SelectionMenuItems
        {...actions}
        count={selection.count}
        onRemoveRequest={() => setIsConfirming(true)}
      />
    ),
  }
}
