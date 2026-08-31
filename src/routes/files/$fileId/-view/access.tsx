import { type GenericId } from "convex/values"
import { lazy } from "react"
import { useMaterialMode } from "@/console/frame/mode"
import { FileShareView } from "@/shared/share/file"
import { useShareSecret } from "@/shared/share/link"

/** Lazy so anonymous share-link visitors do not download the member console
 *  graph after the section frame establishes that there is no member. */
const FileView = lazy(() =>
  import("@/console/files/view").then((module) => ({
    default: module.FileView,
  }))
)

export function FileAccess({ fileId }: { fileId: string }) {
  const mode = useMaterialMode()
  const secret = useShareSecret() ?? null

  if (mode === "share") {
    return <FileShareView fileId={fileId} secret={secret} />
  }

  return (
    <FileView
      fallback={
        secret === null ? undefined : (
          <FileShareView fileId={fileId} secret={secret} />
        )
      }
      fileId={fileId as GenericId<"files">}
    />
  )
}
