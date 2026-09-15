import { type ConsoleDestination } from "../shell/location"
import { type ConsoleSurface } from "../shell/routes"
import { pages } from "./results"

export const searchKeys = { key: "k", mod: true } as const
export const pageKeys = (key: string) => ({ key, alt: true, shift: true })
export const resultKeys = (index: number) => ({
  key: String(index + 1),
  alt: true,
})

export function pageBindings(
  navigate: (destination: ConsoleDestination) => void,
  allowInInput = false,
  available: readonly ConsoleSurface[] = pages
) {
  return available.flatMap((page) =>
    page.shortcut
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
