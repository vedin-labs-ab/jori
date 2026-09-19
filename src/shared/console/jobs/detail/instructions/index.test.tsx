// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { type ToolPermission } from "@/shared/console/tools/model"
import { type Job } from "../../types"
import { JobInstructions } from "."

afterEach(cleanup)

const permissions: ToolPermission[] = [
  {
    access: "write",
    description: "Post a message.",
    label: "Send message",
    mode: "allowed",
    overrideMode: null,
    route: "broker",
    surface: "slack",
    tool: "conversations_add_message",
  },
]

function job(instructions: string): Job {
  return {
    instructions,
    access: {
      surfaces: [
        {
          integration: "slack",
          access: "write",
          tools: ["conversations_add_message"],
        },
      ],
    },
  } as Job
}

test("lays the brief out with every mention as an inert pill", () => {
  const { container } = render(
    <JobInstructions
      job={job(
        "# Weekly\n\nRead the table, then post to @Slack following /reminders and #conversations_add_message.\n\n- One\n- Two"
      )}
      permissions={permissions}
      skills={["reminders"]}
    />
  )

  expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Weekly")
  expect(screen.getAllByRole("listitem")).toHaveLength(2)

  const surface = container.querySelector('[data-job-surface="slack"]')

  expect(surface?.textContent).toBe("Slack1")
  expect(surface?.getAttribute("title")).toBe("Write: 1 enabled")
  expect(
    container.querySelector('[data-job-reference="skill"]')?.textContent
  ).toBe("reminders")
  expect(
    container.querySelector('[data-job-reference="tool"]')?.textContent
  ).toBe("conversations_add_message")
  expect(container.querySelectorAll("button")).toHaveLength(0)
})
