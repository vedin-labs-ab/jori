import { type ReactNode } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ConsolePage } from "@/console/page"
import { ConsoleHeaderActions } from "@/shared/console/layout"
import { FullscreenLoadingProvider } from "@/shared/loading"

export function Document({ children }: { children: ReactNode }) {
  return (
    <FullscreenLoadingProvider>
      <TooltipProvider>{children}</TooltipProvider>
    </FullscreenLoadingProvider>
  )
}

export function Page() {
  return (
    <ConsolePage>
      {(id) => (
        <div data-testid="page">
          {id}
          <ConsoleHeaderActions>
            <button type="button">Page action</button>
          </ConsoleHeaderActions>
        </div>
      )}
    </ConsolePage>
  )
}
