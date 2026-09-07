import { PanelRightClose, Pin, X } from "lucide-react"
import { type RefObject } from "react"
import { Button } from "@/components/ui/button"
import { ContextMenu, ContextMenuTrigger } from "@/components/ui/context-menu"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { scrollFadeX } from "@/shared/fade"
import { referencePresentation } from "../presentation"
import { type ReferenceTarget, type ResolveReference } from "../types"
import { PaneTabMenu } from "./menu"
import { targetKey } from "./routes"
import { type PaneSide, type PaneTab } from "./state"

export type PaneStripProps = {
  active: ReferenceTarget | null
  autoOpens: boolean
  onAutoOpens: (on: boolean) => void
  onActivate: (target: ReferenceTarget) => void
  onClose: (target: ReferenceTarget) => void
  onCloseAll: () => void
  onCloseBeside: (target: ReferenceTarget, side: PaneSide) => void
  onOpenChange: (open: boolean) => void
  onPin: (target: ReferenceTarget) => void
  resolve: ResolveReference
  tabs: PaneTab[]
}

/** The tabs across the top of the pane — one per open target, arrow keys
 *  between them, each with an editor's context menu — and after them the
 *  control that puts the pane away. */
export function PaneStrip({
  active,
  closeRef,
  onActivate,
  onOpenChange,
  resolve,
  tabs,
  ...menu
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
          {tabs.map((tab, index) => (
            <PaneTabItem
              index={index}
              key={targetKey(tab.target)}
              resolve={resolve}
              tab={tab}
              tabs={tabs}
              {...menu}
            />
          ))}
        </TabsList>
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
 *  preview reads in italics, the way an editor's does, and a double
 *  click keeps it, the way an editor's does; its pin shows only while the
 *  pointer or the focus is on the tab, and a pinned tab wears its pin
 *  filled, always. A right click, or the menu key on the focused tab,
 *  opens the tab's menu. */
function PaneTabItem({
  autoOpens,
  index,
  onAutoOpens,
  onClose,
  onCloseAll,
  onCloseBeside,
  onPin,
  resolve,
  tab,
  tabs,
}: {
  autoOpens: boolean
  index: number
  onAutoOpens: (on: boolean) => void
  onClose: (target: ReferenceTarget) => void
  onCloseAll: () => void
  onCloseBeside: (target: ReferenceTarget, side: PaneSide) => void
  onPin: (target: ReferenceTarget) => void
  resolve: ResolveReference
  tab: PaneTab
  tabs: PaneTab[]
}) {
  const reference = resolve(tab.target)
  const presentation = referencePresentation(
    tab.target.kind,
    reference?.name ?? ""
  )
  const Icon = presentation.icon
  const name = reference?.name ?? presentation.label
  // A touch has no pointer to rest on the tab, so its controls stay
  // shown, and larger.
  const revealed =
    "opacity-0 group-focus-within/tab:opacity-100 group-hover/tab:opacity-100 focus-visible:opacity-100 pointer-coarse:opacity-100"
  const control = "text-muted-foreground pointer-coarse:size-7"

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="group/tab flex h-7 shrink-0 items-center rounded-md pr-0.5 has-data-[state=active]:bg-muted">
          <TabsTrigger
            className={cn(
              "h-full max-w-48 flex-none px-2 data-active:bg-transparent data-active:shadow-none",
              !tab.pinned && "italic"
            )}
            onDoubleClick={() => {
              if (!tab.pinned) {
                onPin(tab.target)
              }
            }}
            title={name}
            value={targetKey(tab.target)}
          >
            <Icon aria-hidden className="text-muted-foreground" />
            {/* An italic's last glyph leans past its advance, so the clip
                keeps a pixel of room the layout gives straight back. */}
            <span className="-mr-px min-w-0 truncate pr-px">{name}</span>
          </TabsTrigger>
          <Button
            aria-label={tab.pinned ? `Unpin ${name}` : `Pin ${name}`}
            aria-pressed={tab.pinned}
            className={cn(control, !tab.pinned && revealed)}
            onClick={() => onPin(tab.target)}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            <Pin className={cn(tab.pinned && "fill-current")} />
          </Button>
          <Button
            aria-label={`Close ${name}`}
            className={cn(control, revealed)}
            onClick={() => onClose(tab.target)}
            size="icon-xs"
            type="button"
            variant="ghost"
          >
            <X />
          </Button>
        </div>
      </ContextMenuTrigger>
      <PaneTabMenu
        autoOpens={autoOpens}
        index={index}
        onAutoOpens={onAutoOpens}
        onClose={onClose}
        onCloseAll={onCloseAll}
        onCloseBeside={onCloseBeside}
        onPin={onPin}
        tab={tab}
        tabs={tabs}
      />
    </ContextMenu>
  )
}
