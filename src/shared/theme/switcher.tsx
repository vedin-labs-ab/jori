import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { MoonIcon } from "@/components/ui/moon"
import { SunIcon } from "@/components/ui/sun"
import { SunMoonIcon } from "@/components/ui/sun-moon"
import { useTheme } from "./context"
import { type Theme, themeOption, themeOptions } from "./scheme"

type IconHandle = { startAnimation: () => void; stopAnimation: () => void }

const animatedIcons: Record<Theme, typeof SunIcon> = {
  system: SunMoonIcon,
  light: SunIcon,
  dark: MoonIcon,
}

function nextTheme(theme: Theme): Theme {
  const index = themeOptions.findIndex((option) => option.value === theme)

  return themeOptions[(index + 1) % themeOptions.length]?.value ?? "system"
}

/** One button naming the current choice; each press moves to the next. The
 *  icon animates while the whole button is hovered, not only the icon. */
export function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const icon = useRef<IconHandle>(null)
  const Icon = animatedIcons[theme]
  const next = nextTheme(theme)

  return (
    <Button
      aria-label={`Theme: ${themeOption(theme).label}. Switch to ${themeOption(next).label.toLowerCase()}`}
      className={className}
      onClick={() => setTheme(next)}
      onMouseEnter={() => icon.current?.startAnimation()}
      onMouseLeave={() => icon.current?.stopAnimation()}
      size="sm"
      variant="outline"
    >
      <Icon className="flex" data-icon="inline-start" ref={icon} />
      {themeOption(theme).label}
    </Button>
  )
}
