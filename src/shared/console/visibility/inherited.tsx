import { Folder } from "lucide-react"
import { type ResolvedAudience } from "./audience"
import { VisibilityLabel } from "./badge"

export function InheritedRestrictions({
  inherited,
}: {
  inherited: ResolvedAudience["inherited"]
}) {
  if (inherited.folders.length === 0 && !inherited.unavailable) {
    return null
  }

  return (
    <section
      aria-label="Inherited restrictions"
      className="mt-2 grid gap-2 border-t pt-3"
    >
      <h3 className="font-medium text-sm">Inherited restrictions</h3>
      <p className="text-muted-foreground text-xs">
        Access must also meet each folder's audience. Owners keep access to
        their own items.
      </p>
      {inherited.folders.length === 0 ? null : (
        <ol className="grid gap-2">
          {inherited.folders.map((folder) => (
            <li
              key={folder.folderId}
              className="flex min-w-0 items-start justify-between gap-3 text-sm"
            >
              <span className="flex min-w-0 items-center gap-1.5">
                <Folder
                  aria-hidden
                  className="size-3.5 shrink-0 text-muted-foreground"
                />
                <span className="break-words">{folder.name}</span>
              </span>
              <VisibilityLabel
                visibility={folder.visibility}
                ownerId={folder.ownerId}
              />
            </li>
          ))}
        </ol>
      )}
      {inherited.unavailable ? (
        <p className="text-muted-foreground text-xs">
          Some parent folders are unavailable to you.
        </p>
      ) : null}
    </section>
  )
}
