import { type ReactNode } from "react"
import { cn } from "@/lib/utils"
import { type Theme } from "./scheme"

/** A miniature page in the tokens the theme would use: a card on a ground.
 *  `dark` forces dark tokens, and `inverted` inside it forces light, so the
 *  picture reads the same whichever theme the page is in. */
export function ThemePreview({
  className,
  theme,
}: {
  className?: string
  theme: Theme
}) {
  if (theme === "system") {
    return (
      <span className={cn("@container relative block aspect-[7/5]", className)}>
        <Surface className="absolute inset-0" scheme="light" />
        <Surface
          cardFrom="left-1/2"
          className="absolute inset-0 [clip-path:polygon(50%_0,100%_0,100%_100%,50%_100%)]"
          scheme="dark"
        />
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
  cardFrom = "left-[18%]",
  className,
  scheme,
}: {
  cardFrom?: string
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
      <span
        className={cn(
          "absolute top-[28%] right-0 bottom-0 block rounded-tl-lg border-t border-l bg-background pt-[7%] pl-[9%] font-semibold text-[length:clamp(0.5625rem,13cqw,1rem)] text-foreground leading-none",
          cardFrom
        )}
      >
        Aa
      </span>
    </span>
  )
}
