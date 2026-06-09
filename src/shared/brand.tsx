import { cn } from "@/lib/utils"

export function BrandMark() {
  return (
    <div className="flex items-center gap-2">
      <BrandIcon className="size-8" />
      <span className="text-base font-medium">Milo</span>
    </div>
  )
}

export function BrandIcon({ className }: { className: string }) {
  return (
    <>
      <img
        src="/brand/mark/mark-black.svg"
        alt=""
        className={cn("block dark:hidden", className)}
      />
      <img
        src="/brand/mark/mark-white.svg"
        alt=""
        className={cn("hidden dark:block", className)}
      />
    </>
  )
}
