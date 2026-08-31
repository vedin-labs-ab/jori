import { ChevronLeft, ChevronRight } from "lucide-react"
import { type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { formatFileSize } from "@/shared/materials/size"
import { CopyButton } from "../shared/copy"
import { SeparatorDot } from "../shared/dot"
import { ConsoleListToolbar } from "../shared/list/frame"
import { SaveMeta, type SaveState } from "../shared/materials/save"
import { fileBlobCache } from "./cache/blob"
import { FileOwnerCell } from "./cells"
import { type FileSiblings, useFileNavigate } from "./siblings"
import { type FileDetail } from "./types"

/** Secondary header under the console breadcrumb, shared by every file
 *  view: quiet file meta on the left; per-type tools and the constant
 *  previous/next block on the right. The nav block renders for every type,
 *  so switching files never reflows the header. */
export function FileToolbar({
  children,
  hasArrowKeys = false,
  siblings,
  tools,
}: {
  children: ReactNode
  /** Whether ←/→ navigate on this view; adds the key hints. */
  hasArrowKeys?: boolean
  siblings: FileSiblings
  /** Per-type actions, slotted left of the shared navigation. */
  tools?: ReactNode
}) {
  return (
    <ConsoleListToolbar className="flex-nowrap gap-x-3 py-2">
      <div className="flex min-h-7 min-w-0 flex-1 items-center">{children}</div>
      <div className="flex shrink-0 items-center gap-1.5">
        {tools}
        {tools === undefined ? null : (
          <Separator
            className="data-vertical:h-4 data-vertical:self-center"
            orientation="vertical"
          />
        )}
        <FileNav hasArrowKeys={hasArrowKeys} siblings={siblings} />
      </div>
    </ConsoleListToolbar>
  )
}

/** The shared navigation block: position in the list, then previous/next.
 *  The buttons anchor the toolbar's right edge and disable at the ends. */
function FileNav({
  hasArrowKeys,
  siblings,
}: {
  hasArrowKeys: boolean
  siblings: FileSiblings
}) {
  const goToFile = useFileNavigate()

  return (
    <>
      {siblings.position === null ? null : (
        <span className="whitespace-nowrap text-muted-foreground text-xs tabular-nums max-sm:hidden">
          {siblings.position} of {siblings.count}
        </span>
      )}
      <NavButton
        file={siblings.previous}
        goToFile={goToFile}
        icon={<ChevronLeft />}
        keyHint={hasArrowKeys ? "←" : undefined}
        label="Previous file"
        shortcut="ArrowLeft"
      />
      <NavButton
        file={siblings.next}
        goToFile={goToFile}
        icon={<ChevronRight />}
        keyHint={hasArrowKeys ? "→" : undefined}
        label="Next file"
        shortcut="ArrowRight"
      />
    </>
  )
}

function NavButton({
  file,
  goToFile,
  icon,
  keyHint,
  label,
  shortcut,
}: {
  file: { fileId: FileDetail["fileId"] } | null
  goToFile: (file: { fileId: FileDetail["fileId"] }) => void
  icon: ReactNode
  keyHint: string | undefined
  label: string
  shortcut: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          aria-keyshortcuts={keyHint === undefined ? undefined : shortcut}
          aria-label={label}
          disabled={file === null}
          onClick={() => {
            if (file !== null) {
              goToFile(file)
            }
          }}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          {icon}
        </Button>
      </TooltipTrigger>
      <TooltipContent className="flex items-center gap-1.5">
        {label}
        {keyHint === undefined ? null : <Kbd>{keyHint}</Kbd>}
      </TooltipContent>
    </Tooltip>
  )
}

/** Copy tool for text-backed file views, present from the first paint so
 *  it never pops in or out as views load or modes switch. The value
 *  resolves on click: the editor's saved buffer when the caller has one,
 *  else the stored blob through the cache the view already warmed. */
export function FileCopy({
  file,
  savedText,
  url,
}: {
  file: FileDetail
  /** The editor's saved buffer, preferred over the stored blob. */
  savedText?: string
  url: string
}) {
  return (
    <CopyButton
      label="file text"
      value={async () => {
        if (savedText !== undefined) {
          return savedText
        }

        const cached = await fileBlobCache.load({
          fileId: file.fileId,
          size: file.size,
          updatedAt: file.updatedAt,
          url,
        })

        return await cached.blob.text()
      }}
    />
  )
}

/** The toolbar's metadata line, provenance first: who the file belongs to,
 *  how fresh it is, and its size, separated by the console's inline-meta
 *  middots. The preview below already shows what the file is, so no type
 *  label repeats it; the owner's name sits in the foreground while the
 *  rest stays muted. */
export function FileMeta({
  file,
  saveStatus,
}: {
  file: FileDetail
  /** Editor views pass the autosave state: the Updated label shimmers
   *  while a save is in flight, a check surfaces briefly once it lands,
   *  and a failure says so in words until it clears. */
  saveStatus?: SaveState
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground text-xs">
      <div className="min-w-0 text-foreground">
        <FileOwnerCell compact file={file} />
      </div>
      <SeparatorDot />
      <SaveMeta saveStatus={saveStatus} updatedAt={file.updatedAt} />
      <SeparatorDot className="max-sm:hidden" />
      <span className="shrink-0 max-sm:hidden">
        {formatFileSize(file.size)}
      </span>
    </div>
  )
}
