import { type ComponentProps } from "react"
import { cn } from "@/lib/utils"

export function ConsolePageLayout({
  className,
  ...props
}: ComponentProps<"section">) {
  return (
    <section
      className={cn("flex min-h-0 flex-1 flex-col gap-4", className)}
      {...props}
    />
  )
}

export function ConsoleToolbar({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 md:flex-row md:items-center md:justify-between",
        className
      )}
      {...props}
    />
  )
}

export function ConsoleToolbarActions({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 flex-col gap-2 sm:flex-row md:flex-none",
        className
      )}
      {...props}
    />
  )
}

export function ConsoleContentGrid({
  className,
  ...props
}: ComponentProps<"div">) {
  return <div className={cn("grid gap-4", className)} {...props} />
}

export function ConsoleScrollableGrid({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "grid min-h-0 flex-1 auto-rows-max content-start gap-3 overflow-y-auto",
        className
      )}
      {...props}
    />
  )
}

export function ConsoleScrollableList({
  className,
  ...props
}: ComponentProps<"ul">) {
  return (
    <ul
      className={cn(
        "grid min-h-0 flex-1 auto-rows-max content-start gap-3 overflow-y-auto",
        className
      )}
      {...props}
    />
  )
}
