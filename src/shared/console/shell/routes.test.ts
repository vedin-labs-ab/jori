import { expect, test } from "vitest"
import {
  consoleDocumentTitle,
  isMaterialPage,
  isNavigationActive,
  organizationNeutralPath,
} from "./routes"

test("titles the browser tab with the page, then the product", () => {
  expect(consoleDocumentTitle("/runs")).toBe("Activity · Jori")
  expect(consoleDocumentTitle("/chat")).toBe("New chat · Jori")
  expect(consoleDocumentTitle("/chat/conversations_renewals")).toBe(
    "Chat · Jori"
  )
  expect(consoleDocumentTitle("/context/places")).toBe("Context · Jori")
})

test("a member's page wears its surface's noun until its name has loaded", () => {
  expect(consoleDocumentTitle("/jobs")).toBe("Jobs · Jori")
  expect(consoleDocumentTitle("/jobs/jobs_watch")).toBe("Job · Jori")
  expect(consoleDocumentTitle("/tables/collections_leads")).toBe("Table · Jori")
})

test("New chat is active on its own path alone; the rest on their pages too", () => {
  expect(isNavigationActive("/chat", "/chat", true)).toBe(true)
  expect(isNavigationActive("/chat/", "/chat", true)).toBe(true)
  expect(
    isNavigationActive("/chat/conversations_renewals", "/chat", true)
  ).toBe(false)
  expect(isNavigationActive("/jobs/jobs_watch", "/jobs")).toBe(true)
})

test.each(["/jobs/", "/tables/", "/stores/", "/files/", "/folders/", "/chat/"])(
  "%s retains its list heading with a trailing slash",
  (pathname) => {
    expect(isMaterialPage(pathname)).toBe(false)
    expect(consoleDocumentTitle(pathname)).toBe(
      consoleDocumentTitle(pathname.slice(0, -1))
    )
  }
)

test("a page about one organization's thing gives way to its list when the organization changes", () => {
  expect(organizationNeutralPath("/tables/abc123")).toBe("/tables")
  expect(organizationNeutralPath("/folders/abc123/usage")).toBe("/folders")
  expect(organizationNeutralPath("/chat/abc123")).toBe("/chat")
  expect(organizationNeutralPath("/new")).toBe("/chat")
  // Every other page reads the same in the next organization.
  expect(organizationNeutralPath("/tables")).toBe("/tables")
  expect(organizationNeutralPath("/integrations/personal/")).toBe(
    "/integrations/personal"
  )
})
