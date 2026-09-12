import { integrations } from "@contracts/integrations"
import { expect, test } from "vitest"
import { providerLogo } from "./registry"

test.each(integrations)("provides a logo for the %s integration", (surface) => {
  expect(providerLogo(surface)).toBeDefined()
})
