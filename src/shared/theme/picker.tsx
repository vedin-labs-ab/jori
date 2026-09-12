import { Check } from "lucide-react"
import { type ReactNode, useId } from "react"
import { cn } from "@/lib/utils"
import { useTheme } from "./context"
import { type Theme, themeOptions } from "./scheme"

/** The three choices as cards showing how the console will look. */
export function ThemePicker({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const name = useId()

  return (
    <fieldset
      className={cn("grid max-w-lg grid-cols-3 gap-4", className)}
      data-slot="theme-picker"
    >
      <legend className="sr-only">Theme</legend>
      {themeOptions.map(({ label, value }) => (
        <label
          className="group flex min-w-0 cursor-pointer flex-col gap-2 text-left"
          key={value}
        >
          <input
            checked={theme === value}
            className="peer sr-only"
            name={name}
            onChange={() => setTheme(value)}
            type="radio"
            value={value}
          />
          <span
            aria-hidden="true"
            className="relative block w-full overflow-hidden rounded-xl border-2 border-transparent bg-clip-padding ring-1 ring-border transition-[border-color] group-hover:border-border peer-checked:border-foreground peer-checked:ring-0 peer-focus-visible:ring-2 peer-focus-visible:ring-ring/50"
          >
            <Preview theme={value} />
            {theme === value ? (
              <span className="absolute right-3 bottom-3 flex size-5 items-center justify-center rounded-full bg-foreground text-background">
                <Check className="size-3.5" strokeWidth={3} />
              </span>
            ) : null}
          </span>
          <span className="text-sm">{label}</span>
        </label>
      ))}
    </fieldset>
  )
}

/** A miniature page: a card on a ground, in the tokens the theme would use.
 *  `dark` forces dark tokens, and `inverted` inside it forces light, so the
 *  card reads the same whichever theme the page is in. */
function Preview({ theme }: { theme: Theme }) {
  if (theme === "system") {
    return (
      <span className="relative block aspect-[7/5]">
        <Surface className="absolute inset-0" scheme="light" />
        <Surface
          className="absolute inset-0 [clip-path:polygon(50%_0,100%_0,100%_100%,50%_100%)]"
          scheme="dark"
        />
      </span>
    )
  }

  return <Surface className="block aspect-[7/5]" scheme={theme} />
}

function Surface({
  className,
  scheme,
}: {
  className?: string
  scheme: "light" | "dark"
}) {
  const ground = (children: ReactNode) => (
    <span className={cn("dark", className)}>
      {scheme === "light" ? (
        <span className="inverted block size-full">{children}</span>
      ) : (
        <span className="block size-full">{children}</span>
      )}
    </span>
  )

  return ground(
    <span className="relative block size-full bg-muted">
      <span className="absolute top-[34%] right-0 bottom-0 left-[22%] block rounded-tl-lg border-t border-l bg-background pt-3 pl-3 font-semibold text-foreground text-lg leading-none">
        Aa
      </span>
    </span>
  )
}
