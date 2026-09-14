import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { BrandIcon } from "@/shared/brand"

/** Who a material row belongs to: a named person, or Jori itself when an
 *  organization-principal run created it. The image is the person's
 *  sign-in avatar when their account links one. */
export type MaterialOwner =
  | { kind: "person"; name: string; image?: string }
  | { kind: "jori" }

/** Reserve the avatar and name column before its owner arrives. */
export const ownerColumnClassName = "w-40 min-w-40"

/** Owner cell shared by the material lists: the person's sign-in avatar
 *  (initials when none links) plus their name, or the brand mark plus
 *  "Jori", the two at one size and shape so a column of owners reads as
 *  one column. `compact` slims the avatar and gap to the height of a
 *  detail-frame header row. List rows reserve their width so an arriving
 *  owner cannot resize the table; long names truncate within that space. */
export function MaterialOwnerCell({
  compact = false,
  owner,
}: {
  compact?: boolean
  owner: MaterialOwner
}) {
  const rowClassName = cn(
    "flex min-w-0 items-center",
    compact ? "max-w-40 gap-1.5" : "w-36 gap-2"
  )

  if (owner.kind === "jori") {
    return (
      <div className={rowClassName}>
        <BrandIcon className={compact ? "size-5" : "size-6"} />
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
        {owner.image === undefined ? null : (
          <AvatarImage alt="" src={owner.image} />
        )}
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
