import { type ReactNode, type RefObject, useRef, useState } from "react"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet"
import { useIsMobile } from "@/hooks/use-mobile"
import { ConsoleEmptyState } from "../../list/empty"
import {
  type MaterialBreadcrumb,
  MaterialBreadcrumbContext,
} from "../../materials/breadcrumb"
import { referencePresentation } from "../presentation"
import { type ChatReference, type ReferenceTarget } from "../types"
import { PaneHeader } from "./header"
import { PaneHint } from "./hint"
import { targetKey } from "./routes"
import { PaneStrip, type PaneStripProps } from "./strip"
import { type PanePreference } from "./tabs"

/** The chat column keeps at least this much, in pixels. */
const chatMinWidth = 384
/** The pane keeps at least this much; its default and ceiling are shares
 *  of the whole. */
const paneMinWidth = 320

export type ChatPaneProps = PaneStripProps & {
  /** What the active target shows: the host picks the view and supplies
   *  its data. Nothing means the target opens on its own page only. */
  body: (target: ReferenceTarget) => ReactNode
  /** The thread the pane sits beside. */
  children: ReactNode
  /** The composer under the thread; the hint floats between the two. */
  composer: ReactNode
  onHint?: (preference: PanePreference) => void
  open: boolean
}

/** The chat with a workspace beside it: the resources a conversation is
 *  about, open in tabs to the right of the thread with room for a table.
 *  Wide, the two share the width across a handle; below `md` the pane
 *  covers the chat as a sheet, and Escape puts it away. */
export function ChatPane({
  body,
  children,
  composer,
  onHint,
  open,
  ...strip
}: ChatPaneProps) {
  const isMobile = useIsMobile()
  const closeRef = useRef<HTMLButtonElement>(null)
  const isShown = open && strip.tabs.length > 0
  const chat = (
    <>
      <div className="relative flex min-h-0 flex-1 flex-col">
        {children}
        {onHint === undefined ? null : <PaneHint onChoose={onHint} />}
      </div>
      {composer}
    </>
  )
  const panel = <PanePanel body={body} closeRef={closeRef} {...strip} />

  if (isMobile) {
    return (
      <>
        {chat}
        <Sheet onOpenChange={strip.onOpenChange} open={isShown}>
          <SheetContent
            aria-describedby={undefined}
            className="gap-0 bg-background data-[side=right]:w-full data-[side=right]:sm:max-w-none"
            onOpenAutoFocus={(event) => {
              event.preventDefault()
              closeRef.current?.focus()
            }}
            showCloseButton={false}
            side="right"
          >
            <SheetTitle className="sr-only">Resources</SheetTitle>
            {panel}
          </SheetContent>
        </Sheet>
      </>
    )
  }

  return (
    <ResizablePanelGroup className="min-h-0 flex-1" orientation="horizontal">
      <ResizablePanel
        className="flex min-h-0 flex-col"
        id="chat"
        minSize={chatMinWidth}
      >
        {chat}
      </ResizablePanel>
      {isShown ? (
        <>
          <ResizableHandle withHandle />
          <ResizablePanel
            className="flex min-h-0 flex-col"
            defaultSize="40"
            id="pane"
            maxSize="60"
            minSize={paneMinWidth}
          >
            {panel}
          </ResizablePanel>
        </>
      ) : null}
    </ResizablePanelGroup>
  )
}

function PanePanel({
  body,
  closeRef,
  ...strip
}: PaneStripProps & {
  body: (target: ReferenceTarget) => ReactNode
  closeRef: RefObject<HTMLButtonElement | null>
}) {
  const { active, resolve } = strip
  const reference = active === null ? undefined : resolve(active)
  const isUnavailable =
    reference === undefined || reference.unavailable === true

  return (
    <aside
      aria-label="Resources"
      className="flex min-h-0 flex-1 flex-col bg-background"
    >
      <PaneStrip closeRef={closeRef} {...strip} />
      {active === null ? null : (
        <PaneContent
          // The body is made here, above the crumb's state, so a publish
          // from inside it re-renders the header and not the body: made
          // any lower, a view whose menu is a fresh element each render
          // would publish, re-render, and publish again without end.
          content={isUnavailable ? null : body(active)}
          isUnavailable={isUnavailable}
          key={targetKey(active)}
          reference={reference}
          target={active}
        />
      )}
    </aside>
  )
}

/** The header and body for one target. The body's view may publish a
 *  breadcrumb the way it does on its page; the pane catches it here and
 *  shows it in the header, so nothing reaches the shell's own crumb. Keyed
 *  by the target, so a switch of tab starts the catch afresh. */
function PaneContent({
  content,
  isUnavailable,
  reference,
  target,
}: {
  content: ReactNode
  isUnavailable: boolean
  reference: ChatReference | undefined
  target: ReferenceTarget
}) {
  const [crumb, setCrumb] = useState<MaterialBreadcrumb>()

  return (
    <>
      <PaneHeader crumb={crumb} reference={reference} target={target} />
      {content === null || content === undefined ? (
        <PaneEmpty
          isUnavailable={isUnavailable}
          reference={reference}
          target={target}
        />
      ) : (
        <MaterialBreadcrumbContext.Provider value={setCrumb}>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">{content}</div>
        </MaterialBreadcrumbContext.Provider>
      )}
    </>
  )
}

/** A quiet body: the target is gone, or it has no view for the pane and
 *  the header's name is the way to it. */
function PaneEmpty({
  isUnavailable,
  reference,
  target,
}: {
  isUnavailable: boolean
  reference: ChatReference | undefined
  target: ReferenceTarget
}) {
  const presentation = referencePresentation(target.kind, reference?.name ?? "")

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-4 py-6">
      {isUnavailable ? (
        <ConsoleEmptyState
          description="It was deleted, or is no longer yours to see."
          icon={presentation.icon}
          title="No longer available"
        />
      ) : (
        <ConsoleEmptyState
          description="Open the page to see it in full."
          icon={presentation.icon}
          title={reference?.name ?? presentation.label}
        />
      )}
    </div>
  )
}
