import { type GenericId } from "convex/values"
import { lazy } from "react"
import { MaterialAccess } from "@/shared/share/access"
import { FileShareView } from "@/shared/share/file"

/** Lazy so anonymous share-link visitors do not download the member console
 *  graph after the session check establishes that there is no member. */
const FileView = lazy(() =>
  import("@/console/files/view").then((module) => ({
    default: module.FileView,
  }))
)

export function FileAccess({
  fileId,
  secret,
}: {
  fileId: string
  secret: string | null
}) {
  return (
    <MaterialAccess
      label="Loading file"
      renderMember={(fallback) => (
        <FileView fallback={fallback} fileId={fileId as GenericId<"files">} />
      )}
      renderShare={() => <FileShareView fileId={fileId} secret={secret} />}
      secret={secret}
    />
  )
}
