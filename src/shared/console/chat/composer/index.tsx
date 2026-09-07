import { type ModelSelection } from "@contracts/models/selection"
import { type MessageContext } from "@contracts/replies/answers"
import { EditorContent } from "@tiptap/react"
import { ArrowUp, Square, X } from "lucide-react"
import { useEffect, useId } from "react"
import { Badge } from "@/components/ui/badge"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
} from "@/components/ui/input-group"
import { SigilHints } from "../../mentions/hints"
import {
  emptyMentionSources,
  type MentionSources,
  type MentionSuggestion,
} from "../../mentions/sources"
import { MentionSuggestions } from "../../mentions/suggest/listbox"
import { ContextIndicator } from "../context"
import { ModelPicker } from "../models"
import { referencePresentation } from "../presentation"
import { chatColumnClassName } from "../thread"
import {
  type ChatContextUsage,
  type ChatReference,
  type ChatRun,
  isLiveRun,
  type ResolveReference,
} from "../types"
import { AttachMenu } from "./attach"
import { useComposerEditor } from "./editor"

const sigilHints = [
  { kind: "resource", label: "resources" },
  { kind: "integration", label: "integrations" },
  { kind: "skill", label: "skills" },
  { kind: "tool", label: "tools" },
] as const

/** Where the person writes: plain text with the things it mentions as
 *  chips in it, put there from a sigil's listbox or the "+" menu. Enter
 *  sends and Shift+Enter breaks the line; while a run is live the send
 *  control is the stop control instead. Disabled with a reason, it says
 *  why under the field. The model picker stands with the context ring,
 *  left of it, when the host offers a selection; changing it mid-chat is
 *  fine, the next run takes it. */
export function ChatComposer({
  autoFocus = false,
  context,
  disabled = false,
  live,
  mentions = emptyMentionSources,
  onClearContext,
  onSelect,
  onSend,
  onStop,
  placeholder = "Tell Jori what needs doing",
  reason,
  resolve,
  selection,
  usage,
}: {
  autoFocus?: boolean
  /** The resource the chat is about, shown as a chip the person can drop. */
  context?: ChatReference
  disabled?: boolean
  live: ChatRun | null
  /** What can be mentioned: the host's lists, and its search. */
  mentions?: MentionSources
  onClearContext?: () => void
  /** Takes the model and effort the next run uses. */
  onSelect?: (selection: ModelSelection) => void
  /** Takes the text with its mention tokens, and the resources they
   *  name. */
  onSend: (text: string, references: MessageContext[]) => void
  onStop: () => void
  /** What the empty field says; the home types asks into it. */
  placeholder?: string
  /** Why the composer is disabled, shown when it is. */
  reason?: string
  /** Names the resources mentioned, for their chips. */
  resolve?: ResolveReference
  /** The model and effort the next run uses, shown as the picker. */
  selection?: ModelSelection
  /** How much of the model's window the thread's latest run is using,
   *  shown as a ring left of the send control; nothing before a run. */
  usage?: ChatContextUsage | null
}) {
  const reasonId = useId()
  const isLive = isLiveRun(live)
  const showsReason = disabled && reason !== undefined
  const shownReason = showsReason ? reason : undefined
  const composer = useComposerEditor({
    disabled,
    onSend,
    open: !disabled && !isLive,
    resolve,
    sources: mentions,
  })

  useFieldState(composer.editor, {
    autoFocus,
    describedBy: showsReason ? reasonId : undefined,
    disabled,
  })

  return (
    <form
      className={chatColumnClassName}
      onSubmit={(event) => {
        event.preventDefault()
        composer.send()
      }}
    >
      <InputGroup className="bg-background">
        {context === undefined ? null : (
          <InputGroupAddon align="block-start">
            <ContextChip onClear={onClearContext} reference={context} />
          </InputGroupAddon>
        )}
        <div className="relative w-full min-w-0">
          <EditorContent className="w-full min-w-0" editor={composer.editor} />
          {composer.isEmpty ? (
            <div className="pointer-events-none absolute top-2 right-2 left-2 truncate text-muted-foreground text-sm">
              {placeholder}
            </div>
          ) : null}
          <MentionSuggestions
            emptyMessage={emptySuggestionMessage}
            listboxId={composer.listboxId}
            onActiveIndexChange={composer.setActiveSuggestionIndex}
            onSelect={composer.selectSuggestion}
            state={composer.suggestion}
          />
        </div>
        <ComposerFooter
          canSend={composer.canSend}
          isLive={isLive}
          mentions={mentions}
          onPick={composer.insertMention}
          onSelect={onSelect}
          onStop={onStop}
          reason={
            shownReason === undefined
              ? undefined
              : { id: reasonId, text: shownReason }
          }
          selection={selection}
          usage={usage}
        />
      </InputGroup>
    </form>
  )
}

/** Under the field: the "+" and the sigils on the left, or the reason the
 *  field is disabled; the model, the ring, and the send or stop control
 *  on the right. */
function ComposerFooter({
  canSend,
  isLive,
  mentions,
  onPick,
  onSelect,
  onStop,
  reason,
  selection,
  usage,
}: {
  canSend: boolean
  isLive: boolean
  mentions: MentionSources
  onPick: (suggestion: MentionSuggestion) => void
  onSelect: ((selection: ModelSelection) => void) | undefined
  onStop: () => void
  reason: { id: string; text: string } | undefined
  selection: ModelSelection | undefined
  usage: ChatContextUsage | null | undefined
}) {
  return (
    <InputGroupAddon align="block-end" className="justify-between gap-2">
      <span className="flex min-w-0 items-center gap-1">
        {reason === undefined ? (
          <>
            <AttachMenu onPick={onPick} sources={mentions} />
            <span className="hidden min-w-0 md:flex">
              <SigilHints hints={sigilHints} />
            </span>
          </>
        ) : (
          <span
            className="min-w-0 truncate text-muted-foreground text-xs"
            id={reason.id}
          >
            {reason.text}
          </span>
        )}
      </span>
      <span className="flex items-center gap-1">
        {selection === undefined || onSelect === undefined ? null : (
          <ModelPicker onSelect={onSelect} selection={selection} />
        )}
        {usage === undefined || usage === null ? null : (
          <ContextIndicator usage={usage} />
        )}
        {isLive ? (
          <InputGroupButton
            aria-label="Stop run"
            onClick={onStop}
            size="icon-sm"
            variant="default"
          >
            <Square className="fill-current" />
          </InputGroupButton>
        ) : (
          <InputGroupButton
            aria-label="Send message"
            disabled={!canSend}
            size="icon-sm"
            type="submit"
            variant="default"
          >
            <ArrowUp />
          </InputGroupButton>
        )}
      </span>
    </InputGroupAddon>
  )
}

/** What the field says of itself beyond its words: focused on arrival
 *  when asked, disabled with the reason under it. */
function useFieldState(
  editor: ReturnType<typeof useComposerEditor>["editor"],
  {
    autoFocus,
    describedBy,
    disabled,
  }: { autoFocus: boolean; describedBy: string | undefined; disabled: boolean }
) {
  useEffect(() => {
    if (autoFocus && editor !== null && !disabled) {
      editor.commands.focus("end")
    }
  }, [autoFocus, disabled, editor])

  useEffect(() => {
    const element = editor?.view.dom

    if (element === undefined) {
      return
    }

    if (disabled) {
      element.setAttribute("aria-disabled", "true")
    } else {
      element.removeAttribute("aria-disabled")
    }

    if (describedBy === undefined) {
      element.removeAttribute("aria-describedby")
    } else {
      element.setAttribute("aria-describedby", describedBy)
    }
  }, [describedBy, disabled, editor])
}

function emptySuggestionMessage({
  active,
}: NonNullable<ReturnType<typeof useComposerEditor>["suggestion"]>) {
  switch (active.kind) {
    case "integration":
      return active.query === ""
        ? "No integrations to mention."
        : "No matching integrations."
    case "resource":
      return active.query === ""
        ? "Nothing to mention yet."
        : "No matching resources."
    case "skill":
      return active.query === "" ? "No skills yet." : "No matching skills."
    case "tool":
      return active.query === "" ? "No tools to mention." : "No matching tools."
  }
}

/** The resource the chat was opened about, named by its kind's icon, with
 *  a control to send the next message without it. */
function ContextChip({
  onClear,
  reference,
}: {
  onClear: (() => void) | undefined
  reference: ChatReference
}) {
  const { icon: Icon, label } = referencePresentation(
    reference.kind,
    reference.name
  )

  return (
    <Badge className="max-w-full gap-1 pr-1" variant="outline">
      <Icon aria-hidden="true" />
      <span className="sr-only">{label}: </span>
      <span className="min-w-0 truncate">{reference.name}</span>
      {onClear === undefined ? null : (
        <button
          aria-label={`Remove ${reference.name}`}
          className="grid size-4 cursor-pointer place-items-center rounded-sm outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring/30"
          onClick={onClear}
          type="button"
        >
          <X aria-hidden="true" className="size-3" />
        </button>
      )}
    </Badge>
  )
}
