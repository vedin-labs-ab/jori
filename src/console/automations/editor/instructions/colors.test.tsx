// @vitest-environment jsdom
import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, test } from "vitest"
import { renderInstructionsField } from "./fixtures"

afterEach(cleanup)

const markerToneCases = [
  {
    accessLabel: "No tools",
    scopeIcon: "text-[#78716C]",
    separator: "bg-[#D6D3D1]",
    surface: ["border-[#D6D3D1]", "bg-[#FAFAF9]", "text-[#57534E]"],
    tools: [],
  },
  {
    accessLabel: "Read",
    scopeIcon: "text-[#2563EB]",
    separator: "bg-[#C9D7ED]",
    surface: ["border-[#BFD3F2]", "bg-[#F7FAFF]", "text-[#1F2937]"],
    tools: ["github_get_issue"],
  },
  {
    accessLabel: "Write",
    scopeIcon: "text-[#2F7D4F]",
    separator: "bg-[#C9DED1]",
    surface: ["border-[#BDD8C7]", "bg-[#F6FBF7]", "text-[#1F2937]"],
    tools: ["github_add_issue_comment"],
  },
  {
    accessLabel: "Read/write",
    scopeIcon: "text-[#6256C7]",
    separator: "bg-[#DDD6F5]",
    surface: ["border-[#D4C8F3]", "bg-[#FAF8FF]", "text-[#1F2937]"],
    tools: ["github_get_issue", "github_add_issue_comment"],
  },
] as const

describe("automation instructions marker colors", () => {
  test.each(markerToneCases)("uses the $accessLabel palette", async ({
    accessLabel,
    scopeIcon,
    separator,
    surface,
    tools,
  }) => {
    const field = renderInstructionsField({
      description: "Post to GitHub.",
      surfaces: [{ provider: "github", tools: [...tools] }],
    })

    const accessButton = await screen.findByRole("button", {
      name: `GitHub tools: ${tools.length} enabled. Configure tools.`,
    })
    const buttonGroup = field.container.querySelector(
      '[data-slot="button-group"]'
    )
    const markerSeparator = buttonGroup?.querySelector(
      "[data-automation-surface-separator]"
    )

    expectClasses(buttonGroup, surface)
    expect(accessButton.className).toContain(scopeIcon)
    expect(accessButton.getAttribute("title")).toBe(
      `${accessLabel}: ${tools.length} enabled`
    )
    expect(markerSeparator?.className).toContain(separator)
  })
})

describe("automation instructions blocked marker colors", () => {
  test("uses a blocked palette when policy denies automation access", async () => {
    const field = renderInstructionsField({
      description: "Post to GitHub.",
      permissions: [
        {
          access: "read",
          description: "Read issue",
          label: "Read issue",
          mode: "blocked",
          overrideMode: "blocked",
          provider: "github",
          tool: "github_get_issue",
        },
      ],
      policyKey: "github-read-blocked",
      surfaces: [{ provider: "github", tools: ["github_get_issue"] }],
    })

    const accessButton = await screen.findByRole("button", {
      name: "GitHub tools: 1 enabled, some unavailable. Configure tools.",
    })
    const buttonGroup = field.container.querySelector(
      '[data-slot="button-group"]'
    )
    const markerSeparator = buttonGroup?.querySelector(
      "[data-automation-surface-separator]"
    )

    expect(buttonGroup?.getAttribute("data-automation-surface-policy")).toBe(
      "blocked"
    )
    expectClasses(buttonGroup, [
      "border-destructive/50",
      "bg-destructive/5",
      "text-destructive",
    ])
    expect(accessButton.className).toContain("text-destructive")
    expect(markerSeparator?.className).toContain("bg-destructive/20")
  })
})

function expectClasses(
  element: Element | null | undefined,
  classNames: readonly string[]
) {
  for (const className of classNames) {
    expect(element?.className).toContain(className)
  }
}
