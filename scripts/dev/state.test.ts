import { expect, test } from "vitest"
import { type Facts, needsInstall, stateOf } from "./state"

const running: Facts = {
  answering: true,
  alive: true,
  startedAt: 100,
  lockModified: 10,
  modulesModified: 20,
  envModified: 30,
}

test("a server that answers, is ours, and predates no input is up", () => {
  expect(stateOf(running)).toEqual({ kind: "up" })
  expect(needsInstall(running)).toBe(false)
})

test("a closed port is down whatever the record says", () => {
  expect(stateOf({ ...running, answering: false })).toEqual({ kind: "down" })
})

test("a port answered by a process we did not start is foreign", () => {
  expect(stateOf({ ...running, alive: false })).toEqual({ kind: "foreign" })
  expect(stateOf({ ...running, startedAt: undefined })).toEqual({
    kind: "foreign",
  })
})

test("inputs written after the start make it stale, with every reason", () => {
  expect(stateOf({ ...running, modulesModified: 200 })).toEqual({
    kind: "stale",
    reasons: ["dependencies were installed after it started"],
  })
  expect(stateOf({ ...running, envModified: 200 })).toEqual({
    kind: "stale",
    reasons: [".env.local changed after it started"],
  })
  expect(
    stateOf({ ...running, modulesModified: 200, envModified: 300 })
  ).toEqual({
    kind: "stale",
    reasons: [
      "dependencies were installed after it started",
      ".env.local changed after it started",
    ],
  })
})

test("a lockfile newer than the installed modules needs an install first", () => {
  const facts = { ...running, lockModified: 50 }

  expect(needsInstall(facts)).toBe(true)
  expect(stateOf(facts)).toEqual({
    kind: "stale",
    reasons: ["dependencies changed and are not installed"],
  })
  expect(needsInstall({ ...running, modulesModified: undefined })).toBe(true)
})
