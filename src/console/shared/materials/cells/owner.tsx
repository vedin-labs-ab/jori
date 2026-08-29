import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { BrandIcon } from "@/shared/brand"

/** Who a material row belongs to: a named person, or Jori itself when an
 *  organization-principal run created it. */
export type MaterialOwner = { kind: "person"; name: string } | { kind: "jori" }

/** Owner cell shared by the material lists: initials avatar plus the
 *  person's name, or the brand mark plus "Jori". `compact` slims the avatar
 *  and gap to the height of a detail-frame header row. Both variants cap
 *  their own width, so a long name truncates instead of widening the
 *  column — table cells ignore max-width during column sizing. */
export function MaterialOwnerCell({
  compact = false,
  owner,
}: {
  compact?: boolean
  owner: MaterialOwner
}) {
  const rowClassName = cn(
    "flex min-w-0 items-center",
    compact ? "max-w-40 gap-1.5" : "max-w-48 gap-2"
  )

  if (owner.kind === "jori") {
    return (
      <div className={rowClassName}>
        <BrandIcon className="size-5 shrink-0" />
        <span className="truncate">Jori</span>
      </div>
    )
  }

  return (
    <div className={rowClassName}>
      <Avatar
        className={compact ? "size-5" : undefined}
        size={compact ? "default" : "sm"}
      >
        <AvatarFallback className={compact ? "text-[9px]" : undefined}>
          {initials(owner.name)}
        </AvatarFallback>
      </Avatar>
      <span className="truncate">{owner.name}</span>
    </div>
  )
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => (word[0] ?? "").toUpperCase())
    .join("")
}
