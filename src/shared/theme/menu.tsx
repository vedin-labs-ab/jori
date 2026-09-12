import { Check } from "lucide-react"
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui"
import { useTheme } from "./context"
import { ThemePreview } from "./preview"
import { type Theme, themeOptions } from "./scheme"

/** The three choices as a row of small cards inside a menu. Each card is a
 *  menu radio item, so the arrow keys and the check work as in any menu. */
export function ThemeMenu() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenuPrimitive.RadioGroup
      className="grid grid-cols-3 gap-1 p-1"
      onValueChange={(value) => setTheme(value as Theme)}
      value={theme}
    >
      {themeOptions.map(({ label, value }) => (
        <DropdownMenuPrimitive.RadioItem
          className="group flex cursor-default flex-col gap-1 rounded-md p-1 pb-1.5 text-xs outline-hidden select-none focus:bg-accent focus:text-accent-foreground"
          key={value}
          value={value}
        >
          <span
            aria-hidden="true"
            className="relative block overflow-hidden rounded-md border border-border transition-[border-color] group-data-[state=checked]:border-foreground"
          >
            <ThemePreview theme={value} />
            <DropdownMenuPrimitive.ItemIndicator className="absolute right-1 bottom-1 flex size-3.5 items-center justify-center rounded-full bg-foreground text-background">
              <Check className="size-2.5" strokeWidth={3} />
            </DropdownMenuPrimitive.ItemIndicator>
          </span>
          <span className="px-0.5">{label}</span>
        </DropdownMenuPrimitive.RadioItem>
      ))}
    </DropdownMenuPrimitive.RadioGroup>
  )
}
