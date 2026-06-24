import { expect, test } from "vitest"
import { validateReadOnlyGitArgs } from "./git"

test("allows common read-only git inspection commands", () => {
  expect(() =>
    validateReadOnlyGitArgs(["log", "--oneline", "-10"])
  ).not.toThrow()
  expect(() =>
    validateReadOnlyGitArgs(["branch", "--list", "task/*"])
  ).not.toThrow()
  expect(() =>
    validateReadOnlyGitArgs(["config", "--get", "remote.origin.url"])
  ).not.toThrow()
  expect(() => validateReadOnlyGitArgs(["tag", "-l"])).not.toThrow()
})

test("rejects branch options that are not read-only list operations", () => {
  expect(() => validateReadOnlyGitArgs(["branch", "work"])).toThrow(
    "git branch is not allowed"
  )
  expect(() => validateReadOnlyGitArgs(["branch", "--unknown"])).toThrow(
    "git branch is not allowed"
  )
  expect(() => validateReadOnlyGitArgs(["branch", "--delete", "work"])).toThrow(
    "git branch is not allowed"
  )
})

test("rejects config and tag writes hidden behind read-looking args", () => {
  expect(() =>
    validateReadOnlyGitArgs(["config", "--get", "user.name", "--unset"])
  ).toThrow("git config is not allowed")
  expect(() =>
    validateReadOnlyGitArgs(["config", "--list", "--file", "/etc/passwd"])
  ).toThrow("git config is not allowed")
  expect(() =>
    validateReadOnlyGitArgs(["tag", "--list", "-m", "release"])
  ).toThrow("git tag is not allowed")
  expect(() => validateReadOnlyGitArgs(["tag", "v1.0.0"])).toThrow(
    "git tag is not allowed"
  )
})
