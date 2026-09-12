import { useRef } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoonIcon } from "@/components/ui/moon"
import { SunIcon } from "@/components/ui/sun"
import { SunMoonIcon } from "@/components/ui/sun-moon"
import { useTheme } from "./context"
import { ThemeRadioGroup } from "./options"
import { type Theme, themeOption } from "./scheme"

type IconHandle = { startAnimation: () => void; stopAnimation: () => void }

const animatedIcons: Record<Theme, typeof SunIcon> = {
  system: SunMoonIcon,
  light: SunIcon,
  dark: MoonIcon,
}

/** A button naming the current choice, opening the three options. The icon
 *  animates while the whole button is hovered, not only the icon. */
export function ThemeSwitcher({ className }: { className?: string }) {
  const { theme } = useTheme()
  const icon = useRef<IconHandle>(null)
  const Icon = animatedIcons[theme]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={`Theme: ${themeOption(theme).label}`}
          className={className}
          onMouseEnter={() => icon.current?.startAnimation()}
          onMouseLeave={() => icon.current?.stopAnimation()}
          size="sm"
          variant="outline"
        >
          <Icon className="flex" data-icon="inline-start" ref={icon} />
          {themeOption(theme).label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <ThemeRadioGroup />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
