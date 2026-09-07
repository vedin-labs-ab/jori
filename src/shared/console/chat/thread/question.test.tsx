// @vitest-environment jsdom
import { type PartAnswer } from "@contracts/replies/answers"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { type BundleQuestion, QuestionBundle } from "./question"

afterEach(cleanup)

const channel: BundleQuestion = {
  index: 1,
  part: {
    kind: "choices",
    prompt: "Post the summary to #finance when done?",
    description: "The channel the thread already lives in.",
    options: [
      { label: "Yes, post it", value: "post", description: "A short note." },
      { label: "Keep it here", value: "keep" },
    ],
    freeform: true,
  },
}

const cadence: BundleQuestion = {
  index: 2,
  part: {
    kind: "choices",
    prompt: "How often should it run?",
    options: [
      { label: "Every morning", value: "daily" },
      { label: "Every Monday", value: "weekly" },
    ],
  },
}

const days: BundleQuestion = {
  index: 3,
  part: {
    kind: "choices",
    prompt: "Days to include",
    options: [{ label: "Weekdays" }, { label: "Weekends" }],
    select: "many",
  },
}

function renderBundle(
  questions: BundleQuestion[],
  answers?: Map<number, string[]>
) {
  const onAnswer = vi.fn<(answers: PartAnswer[], text: string) => void>()

  render(
    <QuestionBundle
      answers={answers}
      onAnswer={onAnswer}
      questions={questions}
    />
  )

  return onAnswer
}

function activeQuestion() {
  return screen.getByRole("group", { hidden: false })
}

test("a bundle walks its questions in order, with progress, subtitles, and letter shortcuts", () => {
  renderBundle([channel, cadence, days])

  expect(screen.getByRole("progressbar").textContent).toBe("Question 1 of 3")
  expect(activeQuestion().textContent).toContain(
    "Post the summary to #finance when done?"
  )
  expect(
    screen.getByText("The channel the thread already lives in.")
  ).toBeDefined()
  expect(screen.getByText("A short note.")).toBeDefined()
  expect(within(activeQuestion()).getByText("A")).toBeDefined()
  expect(within(activeQuestion()).getByText("B")).toBeDefined()
  expect(screen.getByRole("textbox", { name: "Your own answer" })).toBeDefined()
  // The later questions wait their turn.
  expect(screen.queryByRole("radio", { name: "Every Monday" })).toBeNull()
  expect(screen.queryByRole("button", { name: "Answer" })).toBeNull()
  expect(screen.queryByRole("button", { name: "Previous" })).toBeNull()

  // Moving on needs an answer; then the next question takes the view.
  fireEvent.click(screen.getByRole("button", { name: "Next" }))

  expect(screen.getByRole("progressbar").textContent).toBe("Question 1 of 3")
  expect(screen.getByRole("alert").textContent).toBe(
    "Choose an answer to continue."
  )

  fireEvent.click(screen.getByRole("radio", { name: /^Yes, post it/ }))
  fireEvent.click(screen.getByRole("button", { name: "Next" }))

  expect(screen.getByRole("progressbar").textContent).toBe("Question 2 of 3")
  expect(activeQuestion().textContent).toContain("How often should it run?")
  expect(screen.getByRole("button", { name: "Previous" })).toBeDefined()

  // Going back keeps what was chosen.
  fireEvent.click(screen.getByRole("button", { name: "Previous" }))

  expect(
    (screen.getByRole("radio", { name: /^Yes, post it/ }) as HTMLInputElement)
      .checked
  ).toBe(true)
})

test("one submit sends every question's answer, as one message with a line each", () => {
  const onAnswer = renderBundle([channel, cadence, days])

  fireEvent.click(screen.getByRole("radio", { name: /^Keep it here/ }))
  fireEvent.click(screen.getByRole("button", { name: "Next" }))
  fireEvent.click(screen.getByRole("radio", { name: "Every Monday" }))
  fireEvent.click(screen.getByRole("button", { name: "Next" }))
  fireEvent.click(screen.getByRole("checkbox", { name: "Weekdays" }))
  fireEvent.click(screen.getByRole("checkbox", { name: "Weekends" }))
  fireEvent.click(screen.getByRole("button", { name: "Answer" }))

  expect(onAnswer).toHaveBeenCalledWith(
    [
      { part: 1, values: ["keep"] },
      { part: 2, values: ["weekly"] },
      { part: 3, values: ["Weekdays", "Weekends"] },
    ],
    [
      "Post the summary to #finance when done? Keep it here",
      "How often should it run? Every Monday",
      "Days to include: Weekdays, Weekends",
    ].join("\n")
  )
})

test("a single question shows no progress and answers on its own", () => {
  const onAnswer = renderBundle([cadence])

  expect(screen.queryByRole("progressbar")).toBeNull()
  expect(screen.queryByRole("button", { name: "Next" })).toBeNull()

  fireEvent.click(screen.getByRole("radio", { name: "Every morning" }))
  fireEvent.click(screen.getByRole("button", { name: "Answer" }))

  expect(onAnswer).toHaveBeenCalledWith(
    [{ part: 2, values: ["daily"] }],
    "How often should it run? Every morning"
  )
})

test("an answer in the person's own words goes as written", () => {
  const onAnswer = renderBundle([channel])

  fireEvent.change(screen.getByRole("textbox", { name: "Your own answer" }), {
    target: { value: "Post it Monday" },
  })
  fireEvent.click(screen.getByRole("button", { name: "Answer" }))

  expect(onAnswer).toHaveBeenCalledWith(
    [{ part: 1, values: ["Post it Monday"] }],
    "Post the summary to #finance when done? Post it Monday"
  )
})

test("an answered bundle shows every question with its choices marked, and stays locked", () => {
  renderBundle(
    [channel, cadence],
    new Map([
      [1, ["keep", "and a note"]],
      [2, ["weekly"]],
    ])
  )

  expect(screen.queryByRole("radio")).toBeNull()
  expect(screen.queryByRole("button")).toBeNull()
  expect(screen.getByText("How often should it run?")).toBeDefined()
  expect(
    screen.getByText("The channel the thread already lives in.")
  ).toBeDefined()
  expect(
    screen
      .getAllByRole("listitem", { current: true })
      .map((item) => item.textContent)
  ).toEqual(["Keep it here", "Every Monday"])
  expect(screen.getByText("and a note")).toBeDefined()
})
