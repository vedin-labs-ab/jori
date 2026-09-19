import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useContext,
} from "react"
import {
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from "@/components/ui/context-menu"
import {
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu"

// A row offers one menu two ways: from its "…" button as a dropdown, and
// from a right-click as a context menu. Radix gives each its own item
// components, so the console's item sets are written once with the parts
// below, and the content they are mounted in says which primitive to draw.

type MenuForm = "dropdown" | "context"

const MenuFormContext = createContext<MenuForm>("dropdown")

/** Wraps the items a context menu's content holds; dropdowns are the
 *  default and need nothing. */
export function ContextMenuItems({ children }: { children: ReactNode }) {
  return <MenuFormContext value="context">{children}</MenuFormContext>
}

function useIsContextMenu() {
  return useContext(MenuFormContext) === "context"
}

export function MenuItem(props: ComponentProps<typeof DropdownMenuItem>) {
  const Item = useIsContextMenu() ? ContextMenuItem : DropdownMenuItem
  return <Item {...props} />
}

export function MenuLabel(props: ComponentProps<typeof DropdownMenuLabel>) {
  const Label = useIsContextMenu() ? ContextMenuLabel : DropdownMenuLabel
  return <Label {...props} />
}

export function MenuSeparator(
  props: ComponentProps<typeof DropdownMenuSeparator>
) {
  const Separator = useIsContextMenu()
    ? ContextMenuSeparator
    : DropdownMenuSeparator
  return <Separator {...props} />
}

export function MenuSub(props: ComponentProps<typeof DropdownMenuSub>) {
  const Sub = useIsContextMenu() ? ContextMenuSub : DropdownMenuSub
  return <Sub {...props} />
}

export function MenuSubTrigger(
  props: ComponentProps<typeof DropdownMenuSubTrigger>
) {
  const SubTrigger = useIsContextMenu()
    ? ContextMenuSubTrigger
    : DropdownMenuSubTrigger
  return <SubTrigger {...props} />
}

export function MenuSubContent(
  props: ComponentProps<typeof DropdownMenuSubContent>
) {
  const SubContent = useIsContextMenu()
    ? ContextMenuSubContent
    : DropdownMenuSubContent
  return <SubContent {...props} />
}
