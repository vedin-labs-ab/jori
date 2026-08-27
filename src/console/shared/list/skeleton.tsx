import { Skeleton } from "@/components/ui/skeleton"

const skeletonRows = ["one", "two", "three", "four", "five", "six"]

/** Loading placeholder for row-shaped list pages. */
export function ConsoleListSkeleton() {
  return (
    <div className="grid gap-2">
      {skeletonRows.map((row) => (
        <Skeleton className="h-10 w-full" key={row} />
      ))}
    </div>
  )
}
