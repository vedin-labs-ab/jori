import { ArrowRight } from "lucide-react"
import {
  type ComponentProps,
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
} from "react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu"
import { useEditMenuFocus } from "../edit/state"
import { menuWidth, RowMenuTrigger } from "."
import { ContextMenuItems, MenuItem, MenuSeparator } from "./items"

// One menu per row, two ways in. The row is the context menu's trigger and
// the row's menu, down in its last cell, supplies the content for both
// forms, so a right-click anywhere on the row and the "…" button offer the
// same items from the same component.

type AreaMenus = {
  /** Opens the row. Where a double-click is what opens one, its menu says
   *  so first, for anyone who has not found that out. */
  onEnter?: () => void
  /** Ran as the menu opens, by a right-click or a touch held in place. */
  onOpen?: () => void
  /** Items that stand in for the row's own on a right-click, when the row
   *  is one of several selected and the menu speaks for all of them. */
  selectionMenu?: ReactNode
}

const RowMenuAreaContext = createContext<AreaMenus | null>(null)

type MenuAreaProps = Pick<
  ComponentProps<typeof ContextMenuTrigger>,
  "children" | "disabled"
>

type MenuTargetProps = MenuAreaProps &
  Pick<ComponentProps<typeof ContextMenuTrigger>, "onPointerDown">

/** Makes its one child element the right-click target for the `RowMenu`
 *  rendered inside it. Disabled, the browser's own menu comes back. */
export function RowMenuArea({
  children,
  disabled,
  onEnter,
  onOpen,
  selectionMenu,
}: MenuAreaProps & AreaMenus) {
  return (
    <ContextMenu onOpenChange={(open) => (open ? onOpen?.() : undefined)}>
      <RowMenuAreaContext value={{ onEnter, selectionMenu }}>
        <MenuTarget
          disabled={disabled}
          // A touch held in place opens the menu from a timer each target
          // starts for itself, so one on a row would also open the list's
          // behind it. The press stops here; a mouse's goes on to the
          // marquee.
          onPointerDown={(event) => {
            if (event.pointerType !== "mouse") {
              event.stopPropagation()
            }
          }}
        >
          {children}
        </MenuTarget>
      </RowMenuAreaContext>
    </ContextMenu>
  )
}

/** A right-click target for items of its own: a list's background, where
 *  the menu is about the list rather than any row. Rows inside keep their
 *  menus, since the innermost target answers first. */
export function MenuArea({
  children,
  disabled,
  menu,
}: MenuAreaProps & { menu: ReactNode }) {
  return (
    <ContextMenu>
      <MenuTarget disabled={disabled}>{children}</MenuTarget>
      <ContextContent>{menu}</ContextContent>
    </ContextMenu>
  )
}

function MenuTarget(props: MenuTargetProps) {
  return (
    <ContextMenuTrigger
      asChild
      // React bubbles a portaled menu's events through the row it was
      // rendered in; a right-click on an open menu is not one on the row.
      onContextMenu={(event) => {
        if (
          !(event.target instanceof Node) ||
          !event.currentTarget.contains(event.target)
        ) {
          event.preventDefault()
        }
      }}
      {...props}
    />
  )
}

/** An item may start naming something in place, as "New table" does. A
 *  closing menu hands focus back to where it opened from, which would
 *  blur that input and end the naming at once, so every menu here lets
 *  the input keep it. */
function ContextContent({ children }: { children: ReactNode }) {
  const onCloseAutoFocus = useEditMenuFocus()

  return (
    <ContextMenuContent
      className={menuWidth}
      onCloseAutoFocus={onCloseAutoFocus}
    >
      <ContextMenuItems>{children}</ContextMenuItems>
    </ContextMenuContent>
  )
}

/** A row's menu, trigger and all: a dropdown under the "…" button, and the
 *  same items as the context menu of the `RowMenuArea` around the row. */
export function RowMenu({
  align = "end",
  children,
  name,
  onOpenChange,
  side,
  trigger,
}: Pick<
  ComponentProps<typeof DropdownMenuContent>,
  "align" | "children" | "side"
> & {
  /** Whose actions these are, for the "…" button's label. */
  name: string
  /** Told when either form opens or closes. */
  onOpenChange?: (open: boolean) => void
  /** A surface's own button in place of the "…", dropdown trigger included. */
  trigger?: ReactNode
}) {
  const area = useContext(RowMenuAreaContext)
  const onCloseAutoFocus = useEditMenuFocus()
  const items = (
    <>
      {area?.onEnter === undefined ? null : (
        <>
          <MenuItem onSelect={area.onEnter}>
            <ArrowRight />
            Open
          </MenuItem>
          <MenuSeparator />
        </>
      )}
      {children}
    </>
  )

  return (
    <>
      <DropdownMenu onOpenChange={onOpenChange}>
        {trigger ?? <RowMenuTrigger name={name} />}
        <DropdownMenuContent
          align={align}
          className={menuWidth}
          onCloseAutoFocus={onCloseAutoFocus}
          side={side}
        >
          {items}
        </DropdownMenuContent>
      </DropdownMenu>
      {area === null ? null : (
        <ContextContent>
          {onOpenChange === undefined ? null : (
            <OpenSignal onOpenChange={onOpenChange} />
          )}
          {area.selectionMenu ?? items}
        </ContextContent>
      )}
    </>
  )
}

/** A context menu's open state lives up at the row, so content that only
 *  mounts while open reports it from here. */
function OpenSignal({
  onOpenChange,
}: {
  onOpenChange: (open: boolean) => void
}) {
  const latest = useRef(onOpenChange)

  useEffect(() => {
    latest.current = onOpenChange
  })
  useEffect(() => {
    latest.current(true)

    return () => latest.current(false)
  }, [])

  return null
}
