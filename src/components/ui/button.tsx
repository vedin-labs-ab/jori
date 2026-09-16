import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@/lib/utils"

// Every variant names its own border color — never the base — so the class
// list carries one border-color utility and stays correct without a
// tailwind-merge pass, which callers of `buttonVariants` are free to skip.
//
// Filled variants keep that border transparent. A border in the fill color is
// a second antialiased shape meeting the background along the radius, and two
// partial coverages only sum to full coverage on whole pixels, so the corners
// show a lighter hairline. `outline` is the one variant that clips its fill to
// the padding box: its border is translucent in dark mode and would read
// denser stacked over a background.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-md border text-xs/relaxed font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 shadow-[0_var(--tactile-depth)_0_0_var(--tactile-edge,transparent)] not-aria-disabled:active:not-aria-[haspopup]:translate-y-[var(--tactile-depth)] not-aria-disabled:active:not-aria-[haspopup]:shadow-[0_0_0_0_var(--tactile-edge,transparent)] disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80 [--tactile-edge:color-mix(in_oklch,var(--primary),#000_30%)]",
        outline:
          "border-border bg-clip-padding hover:bg-input/50 hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:bg-input/30 [--tactile-edge:color-mix(in_oklch,var(--border),#000_18%)] [&:not([data-size*='icon'])_svg:not([class*='text-'])]:text-muted-foreground",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground [--tactile-edge:color-mix(in_oklch,var(--secondary),#000_12%)] [&:not([data-size*='icon'])_svg:not([class*='text-'])]:text-muted-foreground",
        ghost:
          "border-transparent hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50 [&:not([data-size*='icon'])_svg:not([class*='text-'])]:text-muted-foreground",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80 [--tactile-edge:color-mix(in_oklch,var(--destructive),#000_30%)]",
        link: "border-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-7 gap-1 px-2 text-xs/relaxed has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        xs: "h-5 gap-1 rounded-sm px-2 text-[0.625rem] has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-6 gap-1 px-2 text-xs/relaxed has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        lg: "h-8 gap-1 px-2.5 text-xs/relaxed has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2 [&_svg:not([class*='size-'])]:size-4",
        xl: "h-10 gap-2 px-4 text-sm has-data-[icon=inline-end]:pr-3.5 has-data-[icon=inline-start]:pl-3.5 [&_svg:not([class*='size-'])]:size-4",
        icon: "size-7 [&_svg:not([class*='size-'])]:size-3.5",
        "icon-xs": "size-5 rounded-sm [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-lg": "size-8 [&_svg:not([class*='size-'])]:size-4",
      },
      // Flush with the text grid at rest: no horizontal padding, so the
      // label lines up with static siblings, and hovering, focusing, or
      // opening grows the size's padding back, with transition-all easing
      // the shift so the ghost surface starts where the label stood.
      flush: {
        true: "px-0 hover:px-2 focus-visible:px-2 aria-expanded:px-2",
        false: "",
      },
    },
    compoundVariants: [
      {
        size: "lg",
        flush: true,
        class: "hover:px-2.5 focus-visible:px-2.5 aria-expanded:px-2.5",
      },
      {
        size: "xl",
        flush: true,
        class: "hover:px-4 focus-visible:px-4 aria-expanded:px-4",
      },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
      flush: false,
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  flush = false,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, flush, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
