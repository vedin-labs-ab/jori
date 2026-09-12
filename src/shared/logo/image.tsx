import { type ComponentProps } from "react"
import { cn } from "@/lib/utils"
import { type LogoFile } from "./registry"

/** A mark loaded from its file, legible in either scheme: an `ink` mark
 *  inverts on a dark ground, since an image cannot take the text's color
 *  the way an inlined path can, and a mark with a `dark` file swaps to it
 *  there instead. Decorative unless given an `alt`. */
export function LogoImage({
  alt = "",
  className,
  dark,
  ink = false,
  src,
  ...props
}: Omit<ComponentProps<"img">, "src"> &
  LogoFile & {
    /** The file for a dark ground, for a colored mark with a dark ink. */
    dark?: string
  }) {
  const imageClassName = cn("shrink-0", className)

  if (dark !== undefined) {
    return (
      <>
        <img
          alt={alt}
          className={cn(imageClassName, "dark:hidden")}
          src={src}
          {...props}
        />
        <img
          alt={alt}
          className={cn(imageClassName, "hidden dark:block")}
          src={dark}
          {...props}
        />
      </>
    )
  }

  return (
    <img
      alt={alt}
      className={cn(imageClassName, ink && "dark:invert")}
      src={src}
      {...props}
    />
  )
}
