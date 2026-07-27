import { type CSSProperties, type ReactNode, useState } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { SidebarProvider } from "@/components/ui/sidebar"
import { SettingsMobileNav, SettingsSidebar } from "./nav"
import { type SettingsDialogView } from "./types"

type SettingsDialogProps<Value extends string> = {
  children: (view: Value) => ReactNode
  description: string
  headerAction?: (view: Value) => ReactNode
  initialView: Value
  navigationLabel: string
  onOpenChange: (open: boolean) => void
  open: boolean
  views: readonly SettingsDialogView<Value>[]
}

/** Shared desktop sidebar and mobile tab shell for product settings. */
function SettingsDialog<Value extends string>({
  children,
  description,
  headerAction,
  initialView,
  navigationLabel,
  onOpenChange,
  open,
  views,
}: SettingsDialogProps<Value>) {
  const [view, setView] = useState(initialView)
  const activeView = views.find((item) => item.value === view) ?? views[0]

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setView(initialView)
    }
    onOpenChange(nextOpen)
  }

  if (!activeView) {
    return null
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent
        bodyClassName="flex flex-1 overflow-hidden p-0"
        className="h-[calc(100svh-2rem)] sm:h-[min(44rem,calc(100svh-2rem))] sm:max-w-[calc(100%-2rem)] md:max-w-4xl lg:max-w-5xl"
        drawerClassName="max-h-[calc(100svh-0.5rem)]!"
      >
        <SidebarProvider
          className="h-full min-h-0 items-stretch"
          style={{ "--sidebar-width": "13rem" } as CSSProperties}
        >
          <SettingsSidebar
            label={navigationLabel}
            onViewChange={setView}
            view={view}
            views={views}
          />
          {/* Not a main landmark: this opens over the console, which already
              has one, and a document with two is a document with none. The
              dialog role is what scopes it. */}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <header className="shrink-0 border-b px-4 py-3 md:px-6">
              <div className="flex min-h-8 items-center justify-between gap-3">
                <DialogTitle className="text-base font-semibold">
                  {activeView.label}
                </DialogTitle>
                {headerAction?.(view)}
              </div>
              <DialogDescription className="sr-only">
                {description}
              </DialogDescription>
            </header>
            <SettingsMobileNav
              label={navigationLabel}
              onViewChange={setView}
              view={view}
              views={views}
            />
            <div className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 md:p-6">
              {children(view)}
            </div>
          </div>
        </SidebarProvider>
      </DialogContent>
    </Dialog>
  )
}

export { SettingsDialog }
