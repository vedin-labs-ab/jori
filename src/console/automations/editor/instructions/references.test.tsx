// @vitest-environment jsdom
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { renderInstructionsField } from "./fixtures"

afterEach(cleanup)

test("renders sigil-free pills whose icons carry the kind", async () => {
  const field = renderInstructionsField({
    description: "Run /meeting-prep then #conversations_add_message now.",
    surfaces: [],
  })

  expect(await screen.findByRole("textbox")).toBeDefined()

  const skill = field.container.querySelector(
    '[data-automation-reference-kind="skill"]'
  )
  const tool = field.container.querySelector(
    '[data-automation-reference-kind="tool"]'
  )

  expect(skill?.textContent).toBe("meeting-prep")
  expect(tool?.textContent).toBe("conversations_add_message")
  expect(skill?.querySelector("svg")).not.toBeNull()
  expect(tool?.getAttribute("data-automation-reference-access")).toBe(
    "unresolved"
  )
  expect(tool?.getAttribute("title")).toBe(
    "Give @Slack access to use #conversations_add_message."
  )
})

test("marks a tool reference ready when its exact access exists", async () => {
  const field = renderInstructionsField({
    description: "Post with @Slack using #conversations_add_message.",
    surfaces: [
      {
        integration: "slack",
        tools: ["conversations_add_message"],
      },
    ],
  })

  expect(await screen.findByRole("textbox")).toBeDefined()
  expect(
    field.container
      .querySelector('[data-automation-reference-kind="tool"]')
      ?.getAttribute("data-automation-reference-access")
  ).toBe("ready")
})

test("keeps a tool reference visible and unresolved after access is removed", async () => {
  const field = renderInstructionsField({
    description: "Post with @Slack using #conversations_add_message.",
    surfaces: [
      {
        integration: "slack",
        tools: ["conversations_add_message"],
      },
    ],
  })

  fireEvent.click(await screen.findByRole("button", { name: "Remove Slack" }))

  await waitFor(() => {
    const tool = field.container.querySelector(
      '[data-automation-reference-kind="tool"]'
    )

    expect(tool?.getAttribute("data-automation-reference-access")).toBe(
      "unresolved"
    )
    expect(field.onValueChange).toHaveBeenLastCalledWith({
      description: "Post with  using #conversations_add_message.",
      surfaces: [],
    })
  })
})

test("resolves web tool references through the web access control", async () => {
  const permissions = [
    {
      access: "read" as const,
      description: "Search web",
      label: "Search web",
      mode: "allowed" as const,
      overrideMode: null,
      route: "broker" as const,
      surface: "milo" as const,
      tool: "web_search",
    },
  ]
  const disabled = renderInstructionsField({
    description: "Use #web_search.",
    permissions,
    surfaces: [],
    webSearch: false,
  })

  expect(await screen.findByRole("textbox")).toBeDefined()
  expect(
    disabled.container
      .querySelector('[data-automation-reference-kind="tool"]')
      ?.getAttribute("data-automation-reference-access")
  ).toBe("unresolved")

  cleanup()
  const enabled = renderInstructionsField({
    description: "Use #web_search.",
    permissions,
    surfaces: [],
    webSearch: true,
  })

  expect(await screen.findByRole("textbox")).toBeDefined()
  expect(
    enabled.container
      .querySelector('[data-automation-reference-kind="tool"]')
      ?.getAttribute("data-automation-reference-access")
  ).toBe("ready")
})

test("removes a reference from its hover remove button", async () => {
  const field = renderInstructionsField({
    description: "Run /meeting-prep now.",
    surfaces: [],
  })

  const button = await screen.findByRole("button", {
    name: "Remove meeting-prep",
  })

  fireEvent.click(button)

  await waitFor(() => {
    expect(field.onValueChange).toHaveBeenLastCalledWith({
      description: "Run  now.",
      surfaces: [],
    })
  })
})

test("preserves explicit access not represented by an integration pill", async () => {
  const field = renderInstructionsField({
    description: "Run /meeting-prep now.",
    surfaces: [{ integration: "github", tools: ["github_get_issue"] }],
  })

  fireEvent.click(
    await screen.findByRole("button", { name: "Remove meeting-prep" })
  )

  await waitFor(() => {
    expect(field.onValueChange).toHaveBeenLastCalledWith({
      description: "Run  now.",
      surfaces: [{ integration: "github", tools: ["github_get_issue"] }],
    })
  })
})
