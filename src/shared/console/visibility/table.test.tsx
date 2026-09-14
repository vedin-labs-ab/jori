// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { VisibilityLabel } from "./badge"
import { VisibilityDirectoryContext } from "./directory"
import { InheritedRestrictions } from "./inherited"
import { VisibilityNameMark } from "./table"

afterEach(cleanup)

test("folder defaults stay quiet while explicitly repeated restrictions stay visible", () => {
  render(
    <TooltipProvider>
      <VisibilityDirectoryContext.Provider
        value={{
          teams: [{ id: "billing", name: "Billing" }],
          folders: [
            {
              folderId: "finance",
              name: "Finance",
              visibility: { mode: "teams", teamIds: ["billing"] },
            },
          ],
        }}
      >
        <VisibilityLabel
          quietDefault
          folderId="finance"
          visibility={{ mode: "organization" }}
        />
        <VisibilityNameMark
          folderId="finance"
          visibility={{ mode: "organization" }}
        />
        <VisibilityLabel
          quietDefault
          folderId="finance"
          visibility={{ mode: "teams", teamIds: ["billing"] }}
        />
      </VisibilityDirectoryContext.Provider>
    </TooltipProvider>
  )
  expect(screen.getByText("Same as folder")).toBeDefined()
  expect(screen.getByText("Billing")).toBeDefined()
  expect(screen.queryByText("Via folder")).toBeNull()
  expect(screen.queryByText("Organization")).toBeNull()
})

test("the inherited section is absent without restrictions and explains unavailable parents", () => {
  const { rerender } = render(
    <InheritedRestrictions inherited={{ folders: [], unavailable: false }} />
  )
  expect(
    screen.queryByRole("region", { name: "Inherited restrictions" })
  ).toBeNull()
  rerender(
    <InheritedRestrictions inherited={{ folders: [], unavailable: true }} />
  )
  expect(
    screen.getByRole("region", { name: "Inherited restrictions" })
  ).toBeDefined()
  expect(
    screen.getByText("Some parent folders are unavailable to you.")
  ).toBeDefined()
})
