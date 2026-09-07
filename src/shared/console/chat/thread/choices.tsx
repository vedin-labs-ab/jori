import { type ReplyChoice } from "@contracts/replies/parts"
import { Suggestion } from "@/components/ui/suggestion"
import { choiceValue } from "./answers"

/** Next steps offered after a reply, each sent as the person's next
 *  message with one click. */
export function ChoiceChips({
  onChoose,
  options,
}: {
  onChoose: (values: string[], text: string) => void
  options: ReplyChoice[]
}) {
  return (
    <ul aria-label="Next steps" className="flex flex-wrap gap-2">
      {options.map((option) => (
        <li key={choiceValue(option)}>
          <Suggestion
            className="pointer-coarse:h-9"
            onClick={() => onChoose([choiceValue(option)], option.label)}
            suggestion={option.label}
          />
        </li>
      ))}
    </ul>
  )
}
