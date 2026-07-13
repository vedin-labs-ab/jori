// @vitest-environment jsdom
import { type PlaybookBehavior } from "@contracts/playbooks/options"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { BehaviorList } from "./behavior"

afterEach(cleanup)

const behavior = {
  key: "delivery",
  label: "Delivery",
  description: (values) =>
    values.prepared === true ? "Prepared" : "Prepare now",
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
      enabledWhen: { key: "delivery", value: true },
      choices: [{ value: "now", label: "Now" }],
    },
    {
      key: "sendAt",
      label: "Send at",
      kind: "time",
      default: "07:30",
      enabledWhen: { key: "delivery", value: true },
    },
  ],
} satisfies PlaybookBehavior

test("disabled option controls retain the behavior row boundary", () => {
  render(
    <BehaviorList
      behaviors={[behavior]}
      disabled={false}
      fields={[behavior.enabledBy, ...behavior.fields]}
      onChange={vi.fn()}
      values={{ delivery: false, send: "now", sendAt: "07:30" }}
    />
  )

  const select = screen.getByRole("combobox")
  const time = screen.getByLabelText("Send at")
  const field = screen.getByText("Send").parentElement
  const fields = field?.parentElement

  expect(fields?.getAttribute("class")).toContain("pointer-events-none")
  expect(field?.getAttribute("class")).not.toContain("pointer-events-auto")
  for (const control of [select, time]) {
    expect(control).toHaveProperty("disabled", true)
    expect(control.getAttribute("class")).not.toContain("pointer-events-auto")
    const boundaryClassName = control.parentElement?.getAttribute("class")
    expect(boundaryClassName).toContain("pointer-events-auto")
    expect(boundaryClassName).toContain("cursor-not-allowed")
  }
})

test("behavior descriptions follow current options", () => {
  const view = render(
    <BehaviorList
      behaviors={[behavior]}
      disabled={false}
      fields={[behavior.enabledBy, ...behavior.fields]}
      onChange={vi.fn()}
      values={{ delivery: true, prepared: true, send: "now", sendAt: "07:30" }}
    />
  )

  expect(screen.getByText("Prepared")).toBeDefined()

  view.rerender(
    <BehaviorList
      behaviors={[behavior]}
      disabled={false}
      fields={[behavior.enabledBy, ...behavior.fields]}
      onChange={vi.fn()}
      values={{
        delivery: true,
        prepared: false,
        send: "now",
        sendAt: "07:30",
      }}
    />
  )

  expect(screen.queryByText("Prepared")).toBeNull()
  expect(screen.getByText("Prepare now")).toBeDefined()
})
