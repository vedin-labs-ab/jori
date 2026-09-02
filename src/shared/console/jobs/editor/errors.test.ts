import { expect, test } from "vitest"
import { jobScopeConflictMessage } from "../access"
import { isJobFieldError, readJobInstructionsError } from "./errors"

test("routes sharing conflicts to the instructions field", () => {
  expect(
    readJobInstructionsError(jobScopeConflictMessage, "Read @Gmail.")
  ).toBe(jobScopeConflictMessage)
  expect(isJobFieldError(jobScopeConflictMessage)).toBe(true)
})
