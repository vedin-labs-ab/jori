import { type ModelSelection } from "@contracts/models/selection"
import { ArrowUp, Square } from "lucide-react"
import { InputGroupAddon, InputGroupButton } from "@/components/ui/input-group"
import { SigilHints } from "../../mentions/hints"
import {
  type MentionSources,
  type MentionSuggestion,
} from "../../mentions/sources"
import { ContextIndicator } from "../context"
import { ModelPicker } from "../models"
import { type ChatContextUsage } from "../types"
import { AttachMenu } from "./attach"

const sigilHints = [
  { kind: "resource", label: "resources" },
  { kind: "integration", label: "integrations" },
  { kind: "skill", label: "skills" },
  { kind: "tool", label: "tools" },
] as const

/** Under the field: the "+" on the left, or the reason the field is
 *  disabled; the model, the ring, and the send or stop control on the
 *  right; and under them, on the quiet band the job field has, the
 *  sigils. */
export function ComposerFooter({
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
    <>
      <InputGroupAddon align="block-end" className="justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1">
          {reason === undefined ? (
            <AttachMenu onPick={onPick} sources={mentions} />
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
      {/* The sigils on the quiet band the job field has, where a phone's
          keyboard would only cover them. */}
      {reason === undefined ? (
        <InputGroupAddon
          align="block-end"
          className="hidden border-t bg-muted/30 py-1.5 md:flex"
        >
          <SigilHints hints={sigilHints} />
        </InputGroupAddon>
      ) : null}
    </>
  )
}
