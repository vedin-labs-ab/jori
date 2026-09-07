import { type PartAnswer } from "@contracts/replies/answers"
import { type ReplyQuestion } from "@contracts/replies/parts"
import { Check } from "lucide-react"
import { type FormEvent } from "react"
import {
  Questionnaire,
  QuestionnaireActions,
  QuestionnaireChoice,
  QuestionnaireChoiceDescription,
  QuestionnaireChoices,
  QuestionnaireDescription,
  QuestionnaireError,
  QuestionnaireInput,
  QuestionnaireItem,
  QuestionnaireNext,
  QuestionnairePrevious,
  QuestionnaireProgress,
  QuestionnaireSkip,
  QuestionnaireSubmit,
  QuestionnaireTitle,
} from "@/components/ui/questionnaire"
import { cn } from "@/lib/utils"
import { answerLabels, choiceValue, composeAnswers } from "./answers"

/** A question of a reply's, with the index of its part in the reply. */
export type BundleQuestion = { index: number; part: ReplyQuestion }

/** The questions Jori asked in one reply, taken together: a questionnaire
 *  that walks them in order, each answered by a click or its letter, and
 *  sends every answer at once as the next message. Answered, it shows
 *  each question with what was chosen and stays that way. */
export function QuestionBundle({
  answers,
  onAnswer,
  questions,
}: {
  /** The values each part received, once the bundle has been answered. */
  answers: Map<number, string[]> | undefined
  onAnswer: (answers: PartAnswer[], text: string) => void
  questions: BundleQuestion[]
}) {
  if (answers !== undefined) {
    return (
      <div className="grid gap-4">
        {questions.map(({ index, part }) => (
          <AnsweredQuestion
            key={index}
            part={part}
            values={answers.get(index) ?? []}
          />
        ))}
      </div>
    )
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const data = new FormData(event.currentTarget)
    const answered = questions.map(({ index, part }, position) => ({
      index,
      part,
      values: readValues(data.getAll(itemName(position))),
    }))

    onAnswer(
      answered.map(({ index, values }) => ({ part: index, values })),
      composeAnswers(answered)
    )
  }

  return (
    <Questionnaire
      items={questions.map(({ part }, position) => ({
        name: itemName(position),
        required: isRequired(part),
        choices: part.options.map((option) => ({ value: choiceValue(option) })),
      }))}
      onSubmit={submit}
      shortcuts="letters"
    >
      {questions.length > 1 ? <QuestionnaireProgress /> : null}
      {questions.map(({ part }, position) => (
        <QuestionItem
          key={itemName(position)}
          name={itemName(position)}
          part={part}
        />
      ))}
      <QuestionnaireActions>
        <QuestionnairePrevious />
        <QuestionnaireSkip />
        <QuestionnaireNext />
        <QuestionnaireSubmit>Answer</QuestionnaireSubmit>
      </QuestionnaireActions>
    </Questionnaire>
  )
}

function QuestionItem({ name, part }: { name: string; part: ReplyQuestion }) {
  return (
    <QuestionnaireItem
      multiple={part.select === "many"}
      name={name}
      required={isRequired(part)}
    >
      <QuestionnaireTitle>{part.prompt}</QuestionnaireTitle>
      {part.description === undefined ? null : (
        <QuestionnaireDescription>{part.description}</QuestionnaireDescription>
      )}
      <QuestionnaireChoices>
        {part.options.map((option) => (
          <QuestionnaireChoice
            key={choiceValue(option)}
            value={choiceValue(option)}
          >
            {option.label}
            {option.description === undefined ? null : (
              <QuestionnaireChoiceDescription>
                {option.description}
              </QuestionnaireChoiceDescription>
            )}
          </QuestionnaireChoice>
        ))}
        {part.freeform === true ? (
          <QuestionnaireInput
            aria-label="Your own answer"
            placeholder="Or answer in your own words"
          />
        ) : null}
      </QuestionnaireChoices>
      <QuestionnaireError />
    </QuestionnaireItem>
  )
}

/** The question with its answer in place: the chosen options marked,
 *  the rest quiet, and an answer in the person's own words under them. */
function AnsweredQuestion({
  part,
  values,
}: {
  part: ReplyQuestion
  values: string[]
}) {
  const written = values.filter(
    (value) => !part.options.some((option) => choiceValue(option) === value)
  )

  return (
    <div className="grid gap-2">
      <div className="grid gap-1">
        <p className="font-heading font-semibold text-sm">{part.prompt}</p>
        {part.description === undefined ? null : (
          <p className="text-muted-foreground text-xs/relaxed">
            {part.description}
          </p>
        )}
      </div>
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
        <p className="text-xs/relaxed">{answerLabels(part, written)}</p>
      )}
    </div>
  )
}

function itemName(position: number) {
  return `question-${position}`
}

function isRequired(part: ReplyQuestion) {
  return part.required !== false
}

function readValues(values: FormDataEntryValue[]) {
  return values
    .map((value) => String(value).trim())
    .filter((value) => value !== "")
}
