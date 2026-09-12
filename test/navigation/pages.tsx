import { type ReactNode } from "react"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ConsolePage } from "@/console/page"
import { ConsoleHeaderActions } from "@/shared/console/layout"
import { FullscreenLoadingProvider } from "@/shared/loading"
import { ThemeProvider } from "@/shared/theme"

export function Document({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <FullscreenLoadingProvider>
        <TooltipProvider>{children}</TooltipProvider>
      </FullscreenLoadingProvider>
    </ThemeProvider>
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
