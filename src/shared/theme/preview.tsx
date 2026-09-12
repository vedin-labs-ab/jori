import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { type Theme } from "./scheme"

/** A miniature page in the tokens the theme would use: a card on a ground.
 *  System is two such pages side by side, one dark and one light, so the
 *  halves are the same picture inverted. `dark` forces dark tokens, and
 *  `inverted` inside it forces light, so the picture reads the same
 *  whichever theme the page is in. */
export function ThemePreview({
  className,
  theme,
}: {
  className?: string
  theme: Theme
}) {
  if (theme === "system") {
    return (
      <span
        className={cn("@container grid aspect-[7/5] grid-cols-2", className)}
      >
        <Surface scheme="dark" />
        <Surface scheme="light" />
      </span>
    )
  }

  return (
    <Surface
      className={cn("@container block aspect-[7/5]", className)}
      scheme={theme}
    />
  )
}

function Surface({
  className,
  scheme,
}: {
  className?: string
  scheme: "light" | "dark"
}) {
  const ground = (children: ReactNode) => (
    <span className={cn("dark block", className)}>
      {scheme === "light" ? (
        <span className="inverted block size-full">{children}</span>
      ) : (
        <span className="block size-full">{children}</span>
      )}
    </span>
  )

  return ground(
    <span className="relative block size-full bg-muted">
      <span className="absolute top-[24%] right-0 bottom-0 left-[14%] block rounded-tl-lg border-t border-l bg-background pt-[7%] pl-[9%] font-semibold text-[length:clamp(0.5625rem,13cqw,1rem)] text-foreground leading-none">
        Aa
      </span>
    </span>
  )
}
