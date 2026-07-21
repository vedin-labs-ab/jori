"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { isDismissGestureClaimed } from "@/components/ui/dismiss"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { useIsMobile } from "@/hooks/use-mobile"
import { XIcon } from "lucide-react"

const DialogContext = React.createContext({ mobile: false })

function Dialog({
  children,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  const mobile = useIsMobile()

  return (
    <DialogContext.Provider value={{ mobile }}>
      {mobile ? (
        <Drawer {...props}>{children}</Drawer>
      ) : (
        <DialogPrimitive.Root data-slot="dialog" {...props}>
          {children}
        </DialogPrimitive.Root>
      )}
    </DialogContext.Provider>
  )
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  const { mobile } = React.useContext(DialogContext)

  if (mobile) {
    return <DrawerTrigger {...props} />
  }

  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />
}

function DialogPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  const { mobile } = React.useContext(DialogContext)

  if (mobile) {
    return <DrawerPortal {...props} />
  }

  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  const { mobile } = React.useContext(DialogContext)

  if (mobile) {
    return <DrawerClose {...props} />
  }

  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  const { mobile } = React.useContext(DialogContext)

  if (mobile) {
    return <DrawerOverlay className={className} {...props} />
  }

  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 isolate z-50 bg-black/80 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  desktopClassName,
  drawerClassName,
  bodyClassName,
  children,
  showCloseButton = false,
  onPointerDownOutside,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  desktopClassName?: string
  drawerClassName?: string
  bodyClassName?: string
  showCloseButton?: boolean
}) {
  const { mobile } = React.useContext(DialogContext)
  const handlePointerDownOutside: React.ComponentProps<
    typeof DialogPrimitive.Content
  >["onPointerDownOutside"] = (event) => {
    // The gesture that dismissed a select or menu above this dialog
    // must not also dismiss the dialog. See components/ui/dismiss.ts.
    if (isDismissGestureClaimed()) {
      event.preventDefault()
    }
    onPointerDownOutside?.(event)
  }

  if (mobile) {
    return (
      <DrawerContent
        className={cn(className, drawerClassName, "sm:max-w-none!")}
        onPointerDownOutside={handlePointerDownOutside}
        {...props}
      >
        <DialogBody className={bodyClassName}>{children}</DialogBody>
        {showCloseButton ? <DialogCloseButton /> : null}
      </DrawerContent>
    )
  }

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100%-2rem)] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-xl bg-popover text-xs/relaxed text-popover-foreground ring-1 ring-foreground/10 duration-100 outline-none sm:max-w-sm data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
          className,
          desktopClassName
        )}
        onPointerDownOutside={handlePointerDownOutside}
        {...props}
      >
        {/* The card itself must not scroll: browsers paint an opaque
            background into the scrolling contents layer, so overscroll
            bounce would drag it away from the ring. The body scrolls. */}
        <DialogBody className={bodyClassName}>{children}</DialogBody>
        {showCloseButton ? <DialogCloseButton /> : null}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn("grid min-h-0 gap-4 overflow-y-auto p-4", className)}
      {...props}
    />
  )
}

function DialogCloseButton() {
  return (
    <DialogClose asChild>
      <Button
        variant="ghost"
        className="absolute top-2 right-2"
        size="icon-sm"
      >
        <XIcon />
        <span className="sr-only">Close</span>
      </Button>
    </DialogClose>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-1", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <DialogPrimitive.Close asChild>
          <Button variant="outline">Close</Button>
        </DialogPrimitive.Close>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  const { mobile } = React.useContext(DialogContext)

  if (mobile) {
    return <DrawerTitle className={className} {...props} />
  }

  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("font-heading text-sm font-medium", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  const { mobile } = React.useContext(DialogContext)

  if (mobile) {
    return <DrawerDescription className={className} {...props} />
  }

  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn(
        "text-xs/relaxed text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
