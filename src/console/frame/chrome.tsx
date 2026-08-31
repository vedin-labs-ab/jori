import { type ReactNode, Suspense } from "react"
import { ConsolePage } from "../page"
import { ConsolePageLayout } from "../shared/layout"
import { ConsoleListLoading } from "../shared/list/loading"

/**
 * The member half of a material frame. Imported lazily, so a visitor who
 * only holds a share link never downloads the console.
 *
 * The suspense fallback is a page skeleton rather than a fullscreen loader:
 * the chrome around it is already mounted and must stay visible, or moving
 * between a list and one material reads as a page load.
 */
export default function MaterialChrome({ children }: { children: ReactNode }) {
  return (
    <ConsolePage>
      {() => (
        <Suspense
          fallback={
            <ConsolePageLayout>
              <ConsoleListLoading />
            </ConsolePageLayout>
          }
        >
          {children}
        </Suspense>
      )}
    </ConsolePage>
  )
}
