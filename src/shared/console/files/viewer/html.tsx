import { type ReactNode, useState } from "react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { usePreloadSiblings } from "../cache/preload"
import { useDisplayUrl } from "../cache/url"
import { FileEditor, type FileSave } from "../editor/section"
import { type FileSiblings, useSiblingKeys } from "../siblings"
import { FileCopy, FileMeta, FileToolbar } from "../toolbar"
import { type FileDetail } from "../types"
import { ViewerFrame } from "./frame"
import { useViewerStatus } from "./status"

type HtmlMode = "code" | "preview"

/** An HTML file opens rendered — the document in a sandboxed iframe — with
 *  a Preview/Code toggle in the toolbar that drops into the shared text
 *  editor. The mode lives per mount, so every visit opens rendered. */
export function FileHtml({
  errorFallback,
  file,
  onSave,
  siblings,
  url,
}: {
  errorFallback: ReactNode
  file: FileDetail
  onSave: FileSave
  siblings: FileSiblings
  url: string
}) {
  const [mode, setMode] = useState<HtmlMode>("preview")
  const toggle = <HtmlToggle mode={mode} onChange={setMode} />

  if (mode === "code") {
    return (
      <FileEditor
        errorFallback={errorFallback}
        file={file}
        onSave={onSave}
        siblings={siblings}
        tools={toggle}
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
      tools={toggle}
      url={url}
    />
  )
}

/** The console's compact view switcher, as the store editors wear it. */
function HtmlToggle({
  mode,
  onChange,
}: {
  mode: HtmlMode
  onChange: (mode: HtmlMode) => void
}) {
  return (
    <Tabs onValueChange={(value) => onChange(value as HtmlMode)} value={mode}>
      <TabsList className="!h-7">
        <TabsTrigger value="preview">Preview</TabsTrigger>
        <TabsTrigger value="code">Code</TabsTrigger>
      </TabsList>
    </Tabs>
  )
}

/** The rendered document under the shared toolbar. The iframe is
 *  sandboxed with scripts only: the document keeps its interactivity but
 *  runs in an opaque origin — no reach into the console's origin or
 *  storage, no top navigation, no popups, no form submission. */
function HtmlPreview({
  file,
  siblings,
  tools,
  url: currentUrl,
}: {
  file: FileDetail
  siblings: FileSiblings
  tools: ReactNode
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
      <FileToolbar
        hasArrowKeys
        siblings={siblings}
        tools={
          <>
            {tools}
            {/* The live url, not the frozen one — a copy minutes in
                still deserves a fresh signature. */}
            <FileCopy file={file} url={currentUrl} />
          </>
        }
      >
        <FileMeta file={file} />
      </FileToolbar>
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
    </>
  )
}
