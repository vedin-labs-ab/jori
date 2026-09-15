import { type ConsoleDestination } from "../shell/location"
import { pages } from "./results"
import { type SearchPage } from "./types"

export const searchKeys = { key: "k", mod: true } as const
export const pageKeys = (key: string) => ({ key, alt: true, shift: true })
export const resultKeys = (index: number) => ({
  key: String(index + 1),
  alt: true,
})

export function pageBindings(
  navigate: (destination: ConsoleDestination) => void,
  allowInInput = false,
  available: readonly SearchPage[] = pages
) {
  return available.flatMap((page) =>
    page.shortcut && !page.disabledReason
      ? [
          {
            shortcut: pageKeys(page.shortcut),
            allowInInput,
            run: () => navigate({ to: page.to }),
          },
        ]
      : []
  )
}
