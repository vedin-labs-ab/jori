// @vitest-environment jsdom
import { type PlaybookBehavior } from "@contracts/playbooks/options"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { BehaviorList } from "./behavior"

afterEach(cleanup)

const behavior = {
  key: "delivery",
  label: "Delivery",
  enabledBy: {
    key: "delivery",
    label: "Delivery",
    kind: "boolean",
    default: true,
  },
  fields: [
    {
      key: "send",
      label: "Send",
      kind: "choice",
      control: "select",
      default: "now",
      choices: [{ value: "now", label: "Now" }],
    },
  ],
} satisfies PlaybookBehavior

test("only option controls intercept the behavior row target", () => {
  render(
    <BehaviorList
      behaviors={[behavior]}
      disabled={false}
      fields={[behavior.enabledBy, ...behavior.fields]}
      onChange={vi.fn()}
      values={{ delivery: true, send: "now" }}
    />
  )

  const fieldLabel = screen.getByText("Send")
  const field = fieldLabel.parentElement
  const fields = field?.parentElement
  const control = screen.getByRole("combobox")

  expect(fields?.getAttribute("class")).toContain("pointer-events-none")
  expect(field?.getAttribute("class")).not.toContain("pointer-events-auto")
  expect(control.getAttribute("class")).toContain("pointer-events-auto")
})
