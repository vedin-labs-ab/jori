import { expect, test } from "vitest"
import { automationScopeConflictMessage } from "../access"
import {
  isAutomationFieldError,
  readAutomationInstructionsError,
} from "./errors"

test("routes sharing conflicts to the instructions field", () => {
  expect(
    readAutomationInstructionsError(
      automationScopeConflictMessage,
      "Read @Gmail."
    )
  ).toBe(automationScopeConflictMessage)
  expect(isAutomationFieldError(automationScopeConflictMessage)).toBe(true)
})
