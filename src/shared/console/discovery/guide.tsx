import { createPortal } from "react-dom"
import { Card } from "@/components/ui/card"
import { Kbd } from "@/components/ui/kbd"
import { useHeldModifiers } from "@/shared/shortcuts/hold"
import { shortcutLabel } from "@/shared/shortcuts/keys"
import { pageKeys } from "./bindings"
import { pages } from "./results"
import { type SearchPage } from "./types"

export function ShortcutGuide() {
  const visible = useHeldModifiers(pageKeys(""))
  return visible
    ? createPortal(
        <Card className="pointer-events-none fixed right-4 bottom-4 z-50 w-72 max-w-[calc(100vw-2rem)] p-4 shadow-lg">
          <PageShortcuts />
        </Card>,
        document.body
      )
    : null
}

export function PageShortcuts({
  held = true,
  available = pages,
}: {
  held?: boolean
  available?: readonly SearchPage[]
}) {
  return (
    <section aria-label="Page shortcuts" className="@container text-xs/relaxed">
      <dl className="grid grid-cols-1 gap-x-5 gap-y-1 @xs:grid-cols-2">
        {available.map((page) =>
          page.shortcut && !page.disabledReason ? (
            <div
              className="flex items-center justify-between gap-3"
              key={page.to}
            >
              <dt className="flex items-center gap-2">
                <page.icon
                  aria-hidden="true"
                  className="size-3.5 text-muted-foreground"
                />
                {page.label}
              </dt>
              <dd>
                <Kbd>
                  {held
                    ? page.shortcut.toUpperCase()
                    : shortcutLabel(pageKeys(page.shortcut))}
                </Kbd>
              </dd>
            </div>
          ) : null
        )}
      </dl>
    </section>
  )
}
