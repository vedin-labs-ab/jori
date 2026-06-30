// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { expect, test } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { StatusIcon } from "./status"

test("uses a neutral waiting icon for active waiters", () => {
  render(
    <TooltipProvider>
      <StatusIcon
        approval={null}
        now={1700000001000}
        status="running"
        waiter={{ state: "waiting" }}
      />
    </TooltipProvider>
  )

  const status = screen.getByRole("img", { name: "Waiting for input" })

  expect(status.querySelector(".animate-spin")).toBeNull()
})
