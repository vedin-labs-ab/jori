import { ChevronLeft, ChevronRight } from "lucide-react"
import { type ReactNode } from "react"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Dock, DockDivider } from "../dock"
import { type FileSiblings, useFileNavigate } from "./siblings"
import { type FileDetail } from "./types"

/** The file page's dock: the file's place in its list between the steps to
 *  its neighbors, and, for a view with tools of its own, those tools —
 *  folded away until the pointer or the focus is on the dock, so at rest
 *  the bar reads only where the file stands. A file alone in its list
 *  shows the tools plainly, or no dock at all. */
export function FileDock({
  hasArrowKeys = false,
  siblings,
  tools,
}: {
  /** Whether ←/→ navigate on this view; adds the key hints. */
  hasArrowKeys?: boolean
  siblings: FileSiblings
  /** The view's own actions, after the navigation. */
  tools?: ReactNode
}) {
  const hasSiblings = siblings.previous !== null || siblings.next !== null

  if (!hasSiblings && tools === undefined) {
    return null
  }

  return (
    <Dock className="group/dock" label="File navigation">
      {hasSiblings ? (
        <FileNav hasArrowKeys={hasArrowKeys} siblings={siblings} />
      ) : null}
      {tools === undefined ? null : hasSiblings ? (
        <FoldedTools>{tools}</FoldedTools>
      ) : (
        tools
      )}
    </Dock>
  )
}

/** Previous, the position, next. The steps disable at the ends. */
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
      <NavButton
        file={siblings.previous}
        goToFile={goToFile}
        icon={<ChevronLeft />}
        keyHint={hasArrowKeys ? "←" : undefined}
        label="Previous file"
        shortcut="ArrowLeft"
      />
      {siblings.position === null ? null : (
        <span className="whitespace-nowrap px-1 text-muted-foreground text-xs tabular-nums">
          {siblings.position} of {siblings.count}
        </span>
      )}
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

/** The tools behind a divider, in a column that opens from nothing while
 *  the dock is hovered or holds the focus — so a keyboard reaches them by
 *  tabbing past the navigation, and the dock widens from its center. The
 *  clip margin leaves room for a focus ring; the fade covers the fold. */
function FoldedTools({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[0fr] opacity-0 transition-[grid-template-columns,opacity] duration-200 ease-out group-focus-within/dock:grid-cols-[1fr] group-focus-within/dock:opacity-100 group-hover/dock:grid-cols-[1fr] group-hover/dock:opacity-100 motion-reduce:transition-none">
      <div className="flex min-w-0 items-center overflow-clip [overflow-clip-margin:4px]">
        <DockDivider className="mx-1" />
        {children}
      </div>
    </div>
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
          size="icon"
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
