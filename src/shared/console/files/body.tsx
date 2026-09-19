import { type ReactNode, useMemo, useState } from "react"
import { fileKind, isHtmlFile, previewKind } from "@/shared/files/kind"
import { formatFileSize } from "@/shared/files/size"
import { ConsoleEmptyState } from "../list/empty"
import { ConsoleListContent } from "../list/frame"
import { useMaterialTrail } from "../materials/breadcrumb"
import { textSizeLimit, usePreloadSiblings } from "./cache/preload"
import { FileDock } from "./dock"
import {
  FileEditor,
  type FileEditorState,
  type FileSave,
} from "./editor/section"
import { FileDownloadButton } from "./header"
import { FileLead } from "./menu"
import { type FileSiblings, useSiblingKeys } from "./siblings"
import { type FileDetail } from "./types"
import { FileHtml, type HtmlMode } from "./viewer/html"
import { FileViewer } from "./viewer/section"

/** The file page under its header: the content itself filling the page —
 *  media inline, text in an editor, and a download prompt for everything
 *  else — with the dock floating over its foot. The page's chrome hangs
 *  off the file's name in the breadcrumb: its provenance, the view's own
 *  tools, and the actions every file shares, which the host supplies as
 *  the menu around this view's own lines. Keyed by the file, so a step to
 *  a neighbor starts every view fresh. */
export function FileBody(props: {
  file: FileDetail
  /** Persists the text editor's buffer; see `FileSave`. */
  onSave: FileSave
  siblings: FileSiblings
  /** The menu hung off the file's name, given this view's lines to lead
   *  with. */
  titleMenu: (lead: ReactNode) => ReactNode
}) {
  return <FileContent key={props.file.fileId} {...props} />
}

function FileContent({
  file,
  onSave,
  siblings,
  titleMenu,
}: Parameters<typeof FileBody>[0]) {
  const [editor, setEditor] = useState<FileEditorState>()
  const [htmlMode, setHtmlMode] = useState<HtmlMode>("preview")
  const kind = previewKind(file.mimeType, file.name)
  const text =
    kind === "text" && file.url !== null && file.size <= textSizeLimit
      ? { isHtml: isHtmlFile(file.mimeType, file.name), url: file.url }
      : undefined

  useFileCrumb({
    file,
    menu: titleMenu(
      <FileLead
        copy={
          text === undefined
            ? undefined
            : { savedText: editor?.savedText, url: text.url }
        }
        file={file}
        onViewChange={text?.isHtml ? setHtmlMode : undefined}
        view={text?.isHtml ? htmlMode : undefined}
      />
    ),
    saveStatus: editor?.saveStatus,
  })

  if (text !== undefined) {
    return (
      <FileTextBody
        file={file}
        htmlMode={htmlMode}
        isHtml={text.isHtml}
        onSave={onSave}
        onState={setEditor}
        siblings={siblings}
        url={text.url}
      />
    )
  }

  if (kind !== "text" && kind !== "none" && file.url !== null) {
    return (
      <FileViewer file={file} kind={kind} siblings={siblings} url={file.url} />
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

/** Publishes the file's crumb: its name with the menu hung off it, and
 *  the save state the shell shows in the name while a save is in motion. */
function useFileCrumb({
  file,
  menu,
  saveStatus,
}: {
  file: FileDetail
  menu: ReactNode
  saveStatus: FileEditorState["saveStatus"] | undefined
}) {
  useMaterialTrail(
    useMemo(
      () => ({ menu, name: file.name, saveStatus }),
      [file.name, menu, saveStatus]
    )
  )
}

/** Text files open in the autosaving editor — except HTML, which opens
 *  rendered with the same editor behind the menu's Code view. */
function FileTextBody({
  file,
  htmlMode,
  isHtml,
  onSave,
  onState,
  siblings,
  url,
}: {
  file: FileDetail
  htmlMode: HtmlMode
  isHtml: boolean
  onSave: FileSave
  onState: (state: FileEditorState | undefined) => void
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

  if (isHtml) {
    return (
      <FileHtml
        errorFallback={errorFallback}
        file={file}
        mode={htmlMode}
        onSave={onSave}
        onState={onState}
        siblings={siblings}
        url={url}
      />
    )
  }

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

/** Download prompt for files with no inline view — and for text files too
 *  large to edit in place. Nothing here owns the arrow keys, so ←/→
 *  navigate between files. */
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
      <FileDock hasArrowKeys siblings={siblings} />
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
          file.url === null ? undefined : (
            <FileDownloadButton name={file.name} url={file.url} />
          )
        }
        description={description}
        icon={fileKind(file.mimeType, file.name).icon}
        title={title}
      />
    </ConsoleListContent>
  )
}
