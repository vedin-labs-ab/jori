import { useMemo } from "react"
import { DropdownMenuContent } from "@/components/ui/dropdown-menu"
import { fileRows } from "@/landing/demo/derive/materials"
import { useDemoWorkspace } from "@/landing/demo/workspace"
import { FileBody } from "@/shared/console/files/body"
import { noSiblings } from "@/shared/console/files/siblings"
import { ConsoleListLayout } from "@/shared/console/list/frame"
import { delay } from "../fixture/service"

const html =
  '<!doctype html>\n<html lang="en">\n<head><meta charset="utf-8"><title>Renewal summary</title></head>\n<body><h1>Customer renewals</h1><p>Four upcoming renewals are ready for review.</p><ul><li>Harbor House</li><li>Beacon Works</li><li>Juniper Supply</li><li>Larkspur Hotels</li></ul></body>\n</html>\n'

export function FileStates({ state }: { state: string }) {
  const workspace = useDemoWorkspace()
  const file = useMemo(
    () => fileState(state, fileRows(workspace.state)[0]),
    [state, workspace.state]
  )
  return (
    <ConsoleListLayout>
      <FileBody
        file={file}
        onSave={async () => {
          await delay()
          return true
        }}
        siblings={noSiblings}
        titleMenu={(lead) => (
          <DropdownMenuContent align="start">{lead}</DropdownMenuContent>
        )}
      />
    </ConsoleListLayout>
  )
}

function fileState(state: string, seed: ReturnType<typeof fileRows>[number]) {
  const base = {
    ...seed,
    fileId: `layout-${state}` as typeof seed.fileId,
    name: "Renewal summary.html",
    mimeType: "text/html",
    size: html.length,
    url: `data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
  }
  if (state.startsWith("file-audio")) {
    return {
      ...base,
      name: "Audio sample.wav",
      mimeType: "audio/wav",
      size: state.endsWith("long") ? 768078 : 192078,
      url: state.endsWith("long")
        ? "/layout-media/long.wav"
        : "/layout-media/sample.wav",
    }
  }
  if (state.startsWith("file-video")) {
    return {
      ...base,
      name: "Video sample.mp4",
      mimeType: "video/mp4",
      size: state.endsWith("long") ? 9428 : 4015,
      url: state.endsWith("long")
        ? "/layout-media/long.mp4"
        : "/layout-media/sample.mp4",
    }
  }
  if (state === "file-oversized") {
    return {
      ...base,
      name: "Large notes.md",
      mimeType: "text/markdown",
      size: 2 * 1024 * 1024,
      url: "data:text/plain,Large%20notes",
    }
  }
  if (state === "file-missing-url") {
    return {
      ...base,
      name: "Unavailable notes.md",
      mimeType: "text/markdown",
      url: null,
    }
  }
  return base
}
