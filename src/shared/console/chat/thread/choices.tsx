import { type ReplyChoice } from "@contracts/replies/parts"
import { Suggestion, Suggestions } from "@/components/ui/suggestion"
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
    <Suggestions
      aria-label="Next steps"
      className="w-full flex-wrap"
      role="group"
    >
      {options.map((option) => (
        <Suggestion
          key={choiceValue(option)}
          onClick={() => onChoose([choiceValue(option)], option.label)}
          suggestion={option.label}
        />
      ))}
    </Suggestions>
  )
}
