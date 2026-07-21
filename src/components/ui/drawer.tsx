import * as React from "react"
import { Drawer as DrawerPrimitive } from "vaul"

import { cn } from "@/lib/utils"

const DrawerNestingContext = React.createContext(false)
const DrawerFocusContext = React.createContext<
  React.RefObject<HTMLElement | null> | undefined
>(undefined)
const popupContentSelector = [
  '[data-slot="dropdown-menu-content"]',
  '[data-slot="popover-content"]',
  '[data-slot="select-content"]',
].join(",")
const openPopupTriggerSelector = [
  '[data-slot="dropdown-menu-trigger"][data-state="open"]',
  '[data-slot="popover-trigger"][data-state="open"]',
  '[data-slot="select-trigger"][data-state="open"]',
].join(",")

function Drawer({
  children,
  autoFocus = true,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Root>) {
  const nested = React.useContext(DrawerNestingContext)
  const restoreFocusRef = React.useRef<HTMLElement | null>(null)
  const Root = nested ? DrawerPrimitive.NestedRoot : DrawerPrimitive.Root

  return (
    <Root autoFocus={autoFocus} data-slot="drawer" {...props}>
      <DrawerFocusContext.Provider value={restoreFocusRef}>
        <DrawerNestingContext.Provider value>
          {children}
        </DrawerNestingContext.Provider>
      </DrawerFocusContext.Provider>
    </Root>
  )
}

function DrawerTrigger({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Trigger>) {
  return <DrawerPrimitive.Trigger data-slot="drawer-trigger" {...props} />
}

function DrawerPortal({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Portal>) {
  return <DrawerPrimitive.Portal data-slot="drawer-portal" {...props} />
}

function DrawerClose({
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Close>) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />
}

function DrawerOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Overlay>) {
  return (
    <DrawerPrimitive.Overlay
      data-slot="drawer-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/80 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function DrawerContent({
  className,
  children,
  onCloseAutoFocus,
  onOpenAutoFocus,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Content>) {
  const restoreFocusRef = React.useContext(DrawerFocusContext)

  return (
    <DrawerPortal data-slot="drawer-portal">
      <DrawerOverlay />
      <DrawerPrimitive.Content
        data-slot="drawer-content"
        className={cn(
          "group/drawer-content fixed z-50 flex h-auto flex-col bg-transparent p-2 text-xs/relaxed text-popover-foreground before:absolute before:inset-2 before:-z-10 before:rounded-xl before:border before:border-border before:bg-popover data-[vaul-drawer-direction=bottom]:inset-x-0 data-[vaul-drawer-direction=bottom]:bottom-0 data-[vaul-drawer-direction=bottom]:max-h-[calc(100dvh-0.5rem)] data-[vaul-drawer-direction=left]:inset-y-0 data-[vaul-drawer-direction=left]:left-0 data-[vaul-drawer-direction=left]:w-3/4 data-[vaul-drawer-direction=right]:inset-y-0 data-[vaul-drawer-direction=right]:right-0 data-[vaul-drawer-direction=right]:w-3/4 data-[vaul-drawer-direction=top]:inset-x-0 data-[vaul-drawer-direction=top]:top-0 data-[vaul-drawer-direction=top]:max-h-[calc(100dvh-0.5rem)] data-[vaul-drawer-direction=left]:sm:max-w-sm data-[vaul-drawer-direction=right]:sm:max-w-sm",
          className
        )}
        onCloseAutoFocus={(event) => {
          onCloseAutoFocus?.(event)
          const target = restoreFocusRef?.current

          if (!event.defaultPrevented && target?.isConnected) {
            target.focus({ preventScroll: true })
          }

          if (restoreFocusRef) {
            restoreFocusRef.current = null
          }
        }}
        onOpenAutoFocus={(event) => {
          const activeElement = focusReturnTarget()

          if (
            restoreFocusRef &&
            activeElement !== null &&
            activeElement !== document.body
          ) {
            restoreFocusRef.current = activeElement
          }

          onOpenAutoFocus?.(event)
        }}
        {...props}
      >
        <DrawerHandle />
        {children}
      </DrawerPrimitive.Content>
    </DrawerPortal>
  )
}

function focusReturnTarget() {
  const activeElement = document.activeElement

  if (!(activeElement instanceof HTMLElement)) {
    return null
  }

  if (activeElement.closest(popupContentSelector)) {
    const openTriggers = document.querySelectorAll<HTMLElement>(
      openPopupTriggerSelector
    )

    return openTriggers.item(openTriggers.length - 1) ?? activeElement
  }

  return activeElement
}

function DrawerHandle({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Handle>) {
  return (
    <DrawerPrimitive.Handle
      data-slot="drawer-handle"
      className={cn(
        "mx-auto mt-4 hidden h-1.5 w-24 shrink-0 rounded-full bg-muted group-data-[vaul-drawer-direction=bottom]/drawer-content:block",
        className
      )}
      {...props}
    />
  )
}

function DrawerHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-header"
      className={cn(
        "flex flex-col gap-1 p-4 group-data-[vaul-drawer-direction=bottom]/drawer-content:text-center group-data-[vaul-drawer-direction=top]/drawer-content:text-center md:text-left",
        className
      )}
      {...props}
    />
  )
}

function DrawerFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="drawer-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  )
}

function DrawerTitle({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Title>) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn(
        "font-heading text-sm font-medium text-foreground",
        className
      )}
      {...props}
    />
  )
}

function DrawerDescription({
  className,
  ...props
}: React.ComponentProps<typeof DrawerPrimitive.Description>) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-xs/relaxed text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Drawer,
  DrawerPortal,
  DrawerOverlay,
  DrawerTrigger,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerFooter,
  DrawerHandle,
  DrawerTitle,
  DrawerDescription,
}
