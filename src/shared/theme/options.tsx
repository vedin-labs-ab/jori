import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"
import { useTheme } from "./context"
import { type Theme, themeOptions } from "./scheme"

/** The three choices as menu radio items, for any menu that offers them. */
export function ThemeRadioGroup() {
  const { theme, setTheme } = useTheme()

  return (
    <DropdownMenuRadioGroup
      onValueChange={(value) => setTheme(value as Theme)}
      value={theme}
    >
      {themeOptions.map(({ icon: Icon, label, value }) => (
        <DropdownMenuRadioItem key={value} value={value}>
          <Icon />
          {label}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  )
}
