import { cn } from "@/lib/utils"
import { organization } from "./fixtures/organization"

/** Copperline named in prose or a caption: its mark ahead of the bold
 *  name, so the company reads as a company wherever a mock mentions it. */
export function Organization({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "whitespace-nowrap font-semibold text-foreground",
        className
      )}
    >
      <img
        alt=""
        className="mr-1 inline-block size-[0.95em] rounded-avatar align-[-0.15em]"
        src={organization.logo}
      />
      {organization.name}
    </span>
  )
}
