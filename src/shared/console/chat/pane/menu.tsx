import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from "@/components/ui/context-menu"
import { menuWidth } from "../../menu"
import { type ReferenceTarget } from "../types"
import { type PaneSide, type PaneTab } from "./state"

/** What a tab's context menu offers, in the order editors keep: the pin,
 *  then the closes, from this tab outward to everything. A close that
 *  would take nothing is there but disabled, so the menu reads the same
 *  on every tab. */
export function PaneTabMenu({
  index,
  onClose,
  onCloseAll,
  onCloseBeside,
  onPin,
  tab,
  tabs,
}: {
  index: number
  onClose: (target: ReferenceTarget) => void
  onCloseAll: () => void
  onCloseBeside: (target: ReferenceTarget, side: PaneSide) => void
  onPin: (target: ReferenceTarget) => void
  tab: PaneTab
  tabs: PaneTab[]
}) {
  const hasLeft = index > 0
  const hasRight = index < tabs.length - 1

  return (
    <ContextMenuContent className={menuWidth}>
      <ContextMenuItem onSelect={() => onPin(tab.target)}>
        {tab.pinned ? "Unpin" : "Pin"}
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuItem onSelect={() => onClose(tab.target)}>
        Close
      </ContextMenuItem>
      <ContextMenuItem
        disabled={!(hasLeft || hasRight)}
        onSelect={() => onCloseBeside(tab.target, "both")}
      >
        Close others
      </ContextMenuItem>
      <ContextMenuItem
        disabled={!hasLeft}
        onSelect={() => onCloseBeside(tab.target, "left")}
      >
        Close to the left
      </ContextMenuItem>
      <ContextMenuItem
        disabled={!hasRight}
        onSelect={() => onCloseBeside(tab.target, "right")}
      >
        Close to the right
      </ContextMenuItem>
      <ContextMenuItem onSelect={onCloseAll}>Close all</ContextMenuItem>
    </ContextMenuContent>
  )
}
