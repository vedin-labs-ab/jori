import { fileKind, isHtmlFile, previewKind } from "@/shared/files/kind"
import { formatFileSize } from "@/shared/files/size"
import { ConsoleEmptyState } from "../list/empty"
import { ConsoleListContent } from "../list/frame"
import { textSizeLimit, usePreloadSiblings } from "./cache/preload"
import { FileEditor, type FileSave } from "./editor/section"
import { FileDownloadButton } from "./header"
import { type FileSiblings, useSiblingKeys } from "./siblings"
import { FileMeta, FileToolbar } from "./toolbar"
import { type FileDetail } from "./types"
import { FileHtml } from "./viewer/html"
import { FileViewer } from "./viewer/section"

/** The file page under its header: a secondary toolbar with the file's
 *  metadata, and the content itself filling the rest — media inline, text
 *  in an editor, and a download prompt for everything else. */
export function FileBody({
  file,
  onSave,
  siblings,
}: {
  file: FileDetail
  /** Persists the text editor's buffer; see `FileSave`. */
  onSave: FileSave
  siblings: FileSiblings
}) {
  const kind = previewKind(file.mimeType, file.name)

  if (kind === "text" && file.url !== null && file.size <= textSizeLimit) {
    return (
      <FileTextBody
        file={file}
        onSave={onSave}
        siblings={siblings}
        url={file.url}
      />
    )
  }

  if (kind !== "text" && kind !== "none" && file.url !== null) {
    return (
      <FileViewer
        key={file.fileId}
        file={file}
        kind={kind}
        meta={<FileMeta file={file} />}
        siblings={siblings}
        url={file.url}
      />
    )
  }

  return (
    <FileFallbackBody
      file={file}
      isOversizedText={kind === "text"}
      siblings={siblings}
    />
  )
}

/** Text files open in the autosaving editor — except HTML, which opens
 *  rendered with the same editor behind its Code toggle. Both mount keyed
 *  by file id, so navigating text-to-text unmounts the old editor and its
 *  autosave loop flushes the pending draft against the old file instead
 *  of carrying it into the next one. */
function FileTextBody({
  file,
  onSave,
  siblings,
  url,
}: {
  file: FileDetail
  onSave: FileSave
  siblings: FileSiblings
  url: string
}) {
  const errorFallback = (
    <FileFallback
      description="Could not load the file's text. Download it instead."
      file={file}
      title="Could not load file"
    />
  )
  const Body = isHtmlFile(file.mimeType, file.name) ? FileHtml : FileEditor

  return (
    <Body
      key={file.fileId}
      errorFallback={errorFallback}
      file={file}
      onSave={onSave}
      siblings={siblings}
      url={url}
    />
  )
}

/** Download prompt under the toolbar for files with no inline view — and
 *  for text files too large to edit in place. Nothing here owns the arrow
 *  keys, so ←/→ navigate between files. */
function FileFallbackBody({
  file,
  isOversizedText,
  siblings,
}: {
  file: FileDetail
  isOversizedText: boolean
  siblings: FileSiblings
}) {
  useSiblingKeys(siblings)
  // No content to wait for here, so the neighbors warm right away.
  usePreloadSiblings(siblings, true)

  return (
    <>
      <FileToolbar hasArrowKeys siblings={siblings}>
        <FileMeta file={file} />
      </FileToolbar>
      {isOversizedText ? (
        <FileFallback
          description={`Files over ${formatFileSize(textSizeLimit)} skip the inline editor. Download the file to work on it.`}
          file={file}
          title="Too large to edit here"
        />
      ) : (
        <FileFallback
          description="No inline view for this file type. Download it to open it locally."
          file={file}
          title="No inline view"
        />
      )}
    </>
  )
}

function FileFallback({
  description,
  file,
  title,
}: {
  description: string
  file: FileDetail
  title: string
}) {
  return (
    <ConsoleListContent className="justify-center">
      <ConsoleEmptyState
        action={
          file.url === null ? undefined : <FileDownloadButton url={file.url} />
        }
        description={description}
        icon={fileKind(file.mimeType, file.name).icon}
        title={title}
      />
    </ConsoleListContent>
  )
}
