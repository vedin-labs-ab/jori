import { integrations } from "@contracts/integrations"
import { expect, test } from "vitest"
import { providerLogoPath } from "./path"

test.each(integrations)("provides a logo for the %s integration", (surface) => {
  expect(providerLogoPath(surface)).toBeDefined()
})
