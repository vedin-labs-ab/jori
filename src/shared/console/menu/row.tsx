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
import { menuWidth, RowMenuTrigger } from "."
import { ContextMenuItems } from "./items"

// One menu per row, two ways in. The row is the context menu's trigger and
// the row's menu, down in its last cell, supplies the content for both
// forms, so a right-click anywhere on the row and the "…" button offer the
// same items from the same component.

type AreaMenus = {
  /** Items that stand in for the row's own on a right-click, when the row
   *  is one of several selected and the menu speaks for all of them. */
  selectionMenu?: ReactNode
}

const RowMenuAreaContext = createContext<AreaMenus | null>(null)

type MenuAreaProps = Pick<
  ComponentProps<typeof ContextMenuTrigger>,
  "children" | "disabled"
>

/** Makes its one child element the right-click target for the `RowMenu`
 *  rendered inside it. Disabled, the browser's own menu comes back. */
export function RowMenuArea({
  children,
  disabled,
  selectionMenu,
}: MenuAreaProps & AreaMenus) {
  return (
    <ContextMenu>
      <RowMenuAreaContext value={{ selectionMenu }}>
        <MenuTarget disabled={disabled}>{children}</MenuTarget>
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
  onCloseAutoFocus,
}: MenuAreaProps &
  Pick<ComponentProps<typeof ContextMenuContent>, "onCloseAutoFocus"> & {
    menu: ReactNode
  }) {
  return (
    <ContextMenu>
      <MenuTarget disabled={disabled}>{children}</MenuTarget>
      <ContextContent onCloseAutoFocus={onCloseAutoFocus}>
        {menu}
      </ContextContent>
    </ContextMenu>
  )
}

function MenuTarget(props: MenuAreaProps) {
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

function ContextContent({
  children,
  ...props
}: Pick<
  ComponentProps<typeof ContextMenuContent>,
  "children" | "onCloseAutoFocus"
>) {
  return (
    <ContextMenuContent className={menuWidth} {...props}>
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
  onCloseAutoFocus,
  onOpenChange,
  side,
  trigger,
}: Pick<
  ComponentProps<typeof DropdownMenuContent>,
  "align" | "children" | "onCloseAutoFocus" | "side"
> & {
  /** Whose actions these are, for the "…" button's label. */
  name: string
  /** Told when either form opens or closes. */
  onOpenChange?: (open: boolean) => void
  /** A surface's own button in place of the "…", dropdown trigger included. */
  trigger?: ReactNode
}) {
  const area = useContext(RowMenuAreaContext)

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
          {children}
        </DropdownMenuContent>
      </DropdownMenu>
      {area === null ? null : (
        <ContextContent onCloseAutoFocus={onCloseAutoFocus}>
          {onOpenChange === undefined ? null : (
            <OpenSignal onOpenChange={onOpenChange} />
          )}
          {area.selectionMenu ?? children}
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
