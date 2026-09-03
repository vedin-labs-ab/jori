import { expect, test } from "vitest"
import { consoleDocumentTitle } from "./routes"

test("titles the browser tab with the page, then the product", () => {
  expect(consoleDocumentTitle("/runs")).toBe("Activity · Jori")
  expect(consoleDocumentTitle("/context/places")).toBe("Context · Jori")
})

test("a member's page wears its surface's noun until its name has loaded", () => {
  expect(consoleDocumentTitle("/jobs")).toBe("Jobs · Jori")
  expect(consoleDocumentTitle("/jobs/jobs_watch")).toBe("Job · Jori")
  expect(consoleDocumentTitle("/tables/collections_leads")).toBe("Table · Jori")
})
