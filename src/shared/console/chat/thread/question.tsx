import { type ReplyChoices } from "@contracts/replies/parts"
import { Check } from "lucide-react"
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoices,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@/components/ui/questionnaire"
import { cn } from "@/lib/utils"
import { choiceValue, composeAnswer } from "./answers"

const cardClassName = "rounded-lg border bg-background p-3"

/** A question Jori asked: its options to pick one or several of, and,
 *  when the reply allows, a line to answer in other words. Answering
 *  sends the answer as the next message and the card shows what was
 *  chosen from then on. */
export function QuestionCard({
  answered,
  onAnswer,
  part,
}: {
  /** The values already sent for this part, once it has been answered. */
  answered: string[] | undefined
  onAnswer: (values: string[], text: string) => void
  part: ReplyChoices
}) {
  if (answered !== undefined) {
    return <AnsweredQuestion part={part} values={answered} />
  }

  return (
    <Questionnaire
      className={cardClassName}
      onSubmit={(event) => {
        event.preventDefault()

        const values = new FormData(event.currentTarget)
          .getAll("answer")
          .map((value) => String(value).trim())
          .filter((value) => value !== "")

        onAnswer(values, composeAnswer(part, values))
      }}
    >
      <QuestionnaireItem
        multiple={part.select === "many"}
        name="answer"
        required
      >
        <QuestionnaireTitle>{part.prompt}</QuestionnaireTitle>
        <QuestionnaireChoices>
          {part.options.map((option) => (
            <QuestionnaireChoice
              key={choiceValue(option)}
              value={choiceValue(option)}
            >
              {option.label}
            </QuestionnaireChoice>
          ))}
        </QuestionnaireChoices>
        {part.freeform === true ? (
          <QuestionnaireInput
            aria-label="Your own answer"
            placeholder="Or answer in your own words"
          />
        ) : null}
        <QuestionnaireError />
        <QuestionnaireActions>
          <QuestionnaireSubmit>Answer</QuestionnaireSubmit>
        </QuestionnaireActions>
      </QuestionnaireItem>
    </Questionnaire>
  )
}

/** The question with its answer in place: the chosen options marked,
 *  the rest quiet, and an answer in the person's own words under them. */
function AnsweredQuestion({
  part,
  values,
}: {
  part: ReplyChoices
  values: string[]
}) {
  const written = values.filter(
    (value) => !part.options.some((option) => choiceValue(option) === value)
  )

  return (
    <div className={cn(cardClassName, "grid gap-2")}>
      <p className="font-heading font-semibold text-sm">{part.prompt}</p>
      <ul className="grid gap-1 text-xs/relaxed">
        {part.options.map((option) => {
          const chosen = values.includes(choiceValue(option))

          return (
            <li
              aria-current={chosen ? "true" : undefined}
              className={cn(
                "flex items-center gap-2",
                chosen ? "font-medium" : "text-muted-foreground"
              )}
              key={choiceValue(option)}
            >
              <span className="grid size-4 shrink-0 place-items-center">
                {chosen ? (
                  <Check aria-hidden="true" className="size-3.5 text-primary" />
                ) : null}
              </span>
              {option.label}
            </li>
          )
        })}
      </ul>
      {written.length === 0 ? null : (
        <p className="text-xs/relaxed">{written.join(", ")}</p>
      )}
    </div>
  )
}
