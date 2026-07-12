import { integrations } from "@contracts/integrations"
import { expect, test } from "vitest"
import { hasProviderLogo } from "./path"

test.each(integrations)("provides a logo for the %s integration", (surface) => {
  expect(hasProviderLogo(surface)).toBe(true)
})
