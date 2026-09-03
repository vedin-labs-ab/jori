import { type ReactNode } from "react"
import { usePreloadSiblings } from "../cache/preload"
import { useDisplayUrl } from "../cache/url"
import { FileDock } from "../dock"
import {
  FileEditor,
  type FileEditorState,
  type FileSave,
} from "../editor/section"
import { type FileSiblings, useSiblingKeys } from "../siblings"
import { type FileDetail } from "../types"
import { ViewerFrame } from "./frame"
import { useViewerStatus } from "./status"

/** How an HTML file is shown: the document rendered, or its source in
 *  the editor. The page offers the choice in the menu on the file's name. */
export type HtmlMode = "code" | "preview"

/** An HTML file opens rendered — the document in a sandboxed iframe — or,
 *  in code mode, drops into the shared text editor. */
export function FileHtml({
  errorFallback,
  file,
  mode,
  onSave,
  onState,
  siblings,
  url,
}: {
  errorFallback: ReactNode
  file: FileDetail
  mode: HtmlMode
  onSave: FileSave
  onState: (state: FileEditorState | undefined) => void
  siblings: FileSiblings
  url: string
}) {
  if (mode === "code") {
    return (
      <FileEditor
        errorFallback={errorFallback}
        file={file}
        onSave={onSave}
        onState={onState}
        siblings={siblings}
        url={url}
      />
    )
  }

  return (
    // Keyed by the content stamp: when a save lands — the editor's
    // autosave, or a replacement from elsewhere — the preview remounts
    // onto the fresh URL instead of holding the document from before
    // the edit.
    <HtmlPreview
      key={file.updatedAt}
      file={file}
      siblings={siblings}
      url={url}
    />
  )
}

/** The rendered document under the breadcrumb. The iframe is sandboxed
 *  with scripts only: the document keeps its interactivity but runs in an
 *  opaque origin — no reach into the console's origin or storage, no top
 *  navigation, no popups, no form submission. */
function HtmlPreview({
  file,
  siblings,
  url: currentUrl,
}: {
  file: FileDetail
  siblings: FileSiblings
  url: string
}) {
  const url = useDisplayUrl({
    fileId: file.fileId,
    size: file.size,
    updatedAt: file.updatedAt,
    url: currentUrl,
  })
  const { markReady, status } = useViewerStatus(url, false)

  // ←/→ step between files, like every framed document view.
  useSiblingKeys(siblings)
  usePreloadSiblings(siblings, status === "ready")

  return (
    <>
      <ViewerFrame status={status}>
        {url === null ? null : (
          // Documents assume a white page behind them, so the iframe
          // paints one instead of the frame's muted ground.
          <iframe
            className="size-full bg-white"
            onLoad={markReady}
            sandbox="allow-scripts"
            src={url}
            title={file.name}
          />
        )}
      </ViewerFrame>
      <FileDock hasArrowKeys siblings={siblings} />
    </>
  )
}
