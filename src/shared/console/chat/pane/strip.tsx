import { MoreHorizontal, PanelRightClose, Pin, X } from "lucide-react"
import { type RefObject } from "react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { scrollFadeX } from "@/shared/fade"
import { menuWidth } from "../../menu"
import { referencePresentation } from "../presentation"
import { type ReferenceTarget, type ResolveReference } from "../types"
import { targetKey } from "./routes"
import { type PaneTab } from "./tabs"

export type PaneStripProps = {
  active: ReferenceTarget | null
  onActivate: (target: ReferenceTarget) => void
  onClose: (target: ReferenceTarget) => void
  onCloseAll: () => void
  onOpenChange: (open: boolean) => void
  onPin: (target: ReferenceTarget) => void
  resolve: ResolveReference
  tabs: PaneTab[]
}

/** The tabs across the top of the pane — one per open target, arrow keys
 *  between them — with the pane's own controls after them: Close all
 *  behind the overflow, and the control that puts the pane away. */
export function PaneStrip({
  active,
  closeRef,
  onActivate,
  onClose,
  onCloseAll,
  onOpenChange,
  onPin,
  resolve,
  tabs,
}: PaneStripProps & {
  /** The control that closes the pane, for the host to land focus on. */
  closeRef: RefObject<HTMLButtonElement | null>
}) {
  return (
    <Tabs
      className="shrink-0 gap-0 border-b"
      onValueChange={(key) => {
        const tab = tabs.find(
          (candidate) => targetKey(candidate.target) === key
        )

        if (tab !== undefined) {
          onActivate(tab.target)
        }
      }}
      value={active === null ? "" : targetKey(active)}
    >
      <div className="flex items-center gap-1 px-2 py-1.5">
        <TabsList
          aria-label="Open resources"
          className={cn(
            scrollFadeX,
            "min-w-0 flex-1 justify-start gap-1 overflow-x-auto bg-transparent p-0"
          )}
        >
          {tabs.map((tab) => (
            <PaneTabItem
              key={targetKey(tab.target)}
              onClose={onClose}
              onPin={onPin}
              resolve={resolve}
              tab={tab}
            />
          ))}
        </TabsList>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label="Pane options"
              size="icon-sm"
              type="button"
              variant="ghost"
            >
              <MoreHorizontal />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className={menuWidth}>
            <DropdownMenuItem onSelect={onCloseAll}>Close all</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          aria-label="Close pane"
          onClick={() => onOpenChange(false)}
          ref={closeRef}
          size="icon-sm"
          type="button"
          variant="ghost"
        >
          <PanelRightClose />
        </Button>
      </div>
    </Tabs>
  )
}

/** One tab: the target's icon and name, then its pin and its close. A
 *  preview reads in italics, the way an editor's does, and its pin shows
 *  only while the pointer or the focus is on the tab; a pinned tab wears
 *  its pin filled, always. */
function PaneTabItem({
  onClose,
  onPin,
  resolve,
  tab,
}: {
  onClose: (target: ReferenceTarget) => void
  onPin: (target: ReferenceTarget) => void
  resolve: ResolveReference
  tab: PaneTab
}) {
  const reference = resolve(tab.target)
  const presentation = referencePresentation(
    tab.target.kind,
    reference?.name ?? ""
  )
  const Icon = presentation.icon
  const name = reference?.name ?? presentation.label
  const revealed =
    "opacity-0 group-focus-within/tab:opacity-100 group-hover/tab:opacity-100 focus-visible:opacity-100"

  return (
    <div className="group/tab flex h-7 shrink-0 items-center rounded-md pr-0.5 has-data-[state=active]:bg-muted">
      <TabsTrigger
        className={cn(
          "h-full max-w-48 flex-none px-2 data-active:bg-transparent data-active:shadow-none",
          !tab.pinned && "italic"
        )}
        title={name}
        value={targetKey(tab.target)}
      >
        <Icon aria-hidden className="text-muted-foreground" />
        <span className="min-w-0 truncate">{name}</span>
      </TabsTrigger>
      <Button
        aria-label={tab.pinned ? `Unpin ${name}` : `Pin ${name}`}
        aria-pressed={tab.pinned}
        className={cn("text-muted-foreground", !tab.pinned && revealed)}
        onClick={() => onPin(tab.target)}
        size="icon-xs"
        type="button"
        variant="ghost"
      >
        <Pin className={cn(tab.pinned && "fill-current")} />
      </Button>
      <Button
        aria-label={`Close ${name}`}
        className={cn("text-muted-foreground", revealed)}
        onClick={() => onClose(tab.target)}
        size="icon-xs"
        type="button"
        variant="ghost"
      >
        <X />
      </Button>
    </div>
  )
}
