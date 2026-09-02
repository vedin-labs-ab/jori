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
        offer={null}
        status="running"
        waiter={{ state: "waiting" }}
      />
    </TooltipProvider>
  )

  const status = screen.getByRole("img", { name: "Waiting for input" })

  expect(status.querySelector(".animate-spin")).toBeNull()
})

test("uses a muted waiting icon for live integration offers", () => {
  render(
    <TooltipProvider>
      <StatusIcon
        approval={null}
        now={1700000001000}
        offer={{ expiresAt: 1700001800000, state: "pending" }}
        status="completed"
        waiter={null}
      />
    </TooltipProvider>
  )

  const status = screen.getByRole("img", { name: "Completed, Needs action" })

  expect(status.querySelector(".text-muted-foreground")).not.toBeNull()
  expect(status.querySelector(".animate-spin")).toBeNull()
})
