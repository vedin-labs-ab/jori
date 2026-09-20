import { type ModelSlug } from "@contracts/models/catalog"
import { type ModelSelection } from "@contracts/models/selection"
import { type MessageContext } from "@contracts/replies/references"
import {
  type FormEvent,
  type MouseEvent,
  memo,
  type ReactNode,
  useEffect,
  useId,
} from "react"
import { InputGroup } from "@/components/ui/input-group"
import { useStoredOpen } from "@/shared/storage"
import {
  emptyMentionSources,
  type MentionSources,
} from "../../mentions/sources"
import { type ReferenceView, type ResolveReference } from "../../references"
import { chatColumnClassName } from "../thread"
import { type ChatContextUsage } from "../types"
import { useComposerEditor } from "./editor"
import { ComposerField } from "./field"
import { ComposerFooter, HintsPeek } from "./footer"

/** Where the person writes: plain text with the things it mentions as
 *  chips in it, put there from a sigil's listbox or the "+" menu. Enter
 *  sends and Shift+Enter breaks the line; while a run is live the stop
 *  control stays beside send, and while the host is still
 *  answering a send the draft waits in the field behind a spinner.
 *  Failed sends keep the draft and the host reports them in a toast. The picker
 *  stands with the context ring, left of it, when the host offers a
 *  selection; changing it mid-chat is fine, the next run takes it.
 *  Memoized: the host's handlers must keep their identity, and then a
 *  change in the thread beside it leaves the editor alone. */
export const ChatComposer = memo(function ChatComposer({
  autoFocus = false,
  availableModels,
  initialReference,
  metadata,
  isLive = false,
  mentions = emptyMentionSources,
  onMention,
  onSelect,
  onSend,
  onUnmention,
  onStop,
  placeholder = "Tell Jori what needs doing",
  resolve,
  selection,
  usage,
}: {
  autoFocus?: boolean
  availableModels?: readonly ModelSlug[]
  /** Seeded once as a normal, removable mention in the text. */
  initialReference?: ReferenceView
  /** Conversation filing and audience, outside the message field. */
  metadata?: ReactNode
  /** A run is answering: follow-ups can still be sent, or work stopped. */
  isLive?: boolean
  /** What can be mentioned: the host's lists, and its search. */
  mentions?: MentionSources
  /** Takes each resource as it is mentioned, so a host with a pane can
   *  show what the person is talking about. */
  onMention?: (target: MessageContext) => void
  /** Takes the model and effort the next run uses. */
  onSelect?: (selection: ModelSelection) => void
  /** Takes the text with its mention tokens, and the resources they
   *  name; a promise holds the draft, cleared on resolve, kept on reject. */
  onSend: (text: string, references: MessageContext[]) => unknown
  onStop: () => void
  /** Takes each resource whose chip is deleted, so a host that opened
   *  it on the mention can let it go again. */
  onUnmention?: (target: MessageContext) => void
  /** What the empty field says; the home types asks into it, as a node
   *  that keeps its ticks to itself. */
  placeholder?: ReactNode
  /** Names the resources mentioned, for their chips. */
  resolve?: ResolveReference
  /** The model and effort the next run uses, shown as the picker. */
  selection?: ModelSelection
  /** How much of the model's window the thread's latest run is using,
   *  shown as a ring left of the send control; nothing before a run. */
  usage?: ChatContextUsage | null
}) {
  const hints = useHintsBand()
  const composer = useComposerEditor({
    initialReference,
    onMention,
    onSend,
    onUnmention,
    resolve,
    sources: mentions,
  })

  useFieldState(composer.editor, {
    autoFocus,
    pending: composer.pending,
  })

  return (
    <div className={chatColumnClassName}>
      {metadata}
      <form onSubmit={(event) => sendOnSubmit(event, composer.send)}>
        <InputGroup
          className="bg-background"
          onClick={(event) => focusFromFrame(event, composer.editor)}
        >
          <ComposerField
            composer={composer}
            onSelect={composer.selectSuggestion}
            placeholder={placeholder}
          />
          <ComposerFooter
            availableModels={availableModels}
            canSend={composer.canSend}
            hintsId={hints.id}
            isLive={isLive}
            mentions={mentions}
            onHideHints={hints.open ? hints.hide : undefined}
            onPick={composer.insertMention}
            onSelect={onSelect}
            onStop={onStop}
            pending={composer.pending}
            selection={selection}
            usage={usage}
          />
        </InputGroup>
        <HintsPeek hintsId={hints.id} onShow={hints.show} />
      </form>
    </div>
  )
})

/** The send control pressed: the draft goes, and the page stays. */
function sendOnSubmit(event: FormEvent, send: () => void) {
  event.preventDefault()
  send()
}

/** The sigils' band under the footer: shown until folded away, as the
 *  browser remembers, and named for the controls that fold and unfold
 *  it. */
function useHintsBand() {
  const id = useId()
  const [open, setOpen] = useStoredOpen("jori.chat.hints")

  return {
    hide: () => setOpen(false),
    id,
    open,
    show: open ? undefined : () => setOpen(true),
  }
}

/** Focus on arrival, without opening a phone keyboard. A pending send
 * holds the draft read-only until it succeeds or can be retried. */
function useFieldState(
  editor: ReturnType<typeof useComposerEditor>["editor"],
  { autoFocus, pending }: { autoFocus: boolean; pending: boolean }
) {
  useEffect(() => {
    if (autoFocus && editor !== null && !hasCoarsePointer()) {
      editor.commands.focus("end")
    }
  }, [autoFocus, editor])

  useEffect(() => {
    if (editor === null) {
      return
    }
    editor.setEditable(!pending)
    const element = editor.view.dom
    if (pending) {
      element.setAttribute("aria-disabled", "true")
    } else {
      element.removeAttribute("aria-disabled")
    }
  }, [editor, pending])
}

function hasCoarsePointer() {
  return (
    typeof window.matchMedia === "function" &&
    window.matchMedia("(pointer: coarse)").matches
  )
}

/** A click on the frame itself, or on the footer beside its controls,
 *  goes to the field, so the person never lands nowhere. */
function focusFromFrame(
  event: MouseEvent<HTMLDivElement>,
  editor: ReturnType<typeof useComposerEditor>["editor"]
) {
  const interactive =
    "button, a, [contenteditable], [role=menu], [role=dialog], [role=listbox]"

  if ((event.target as HTMLElement).closest(interactive) === null) {
    editor?.commands.focus("end")
  }
}
