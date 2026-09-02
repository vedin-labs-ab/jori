import { expect, test } from "vitest"
import { consoleDocumentTitle } from "./routes"

test("titles the browser tab with the page, then the product", () => {
  expect(consoleDocumentTitle("/runs")).toBe("Activity · Jori")
  expect(consoleDocumentTitle("/context/places")).toBe("Context · Jori")
})
