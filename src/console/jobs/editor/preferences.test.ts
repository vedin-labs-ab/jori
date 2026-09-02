// @vitest-environment jsdom
import { afterEach, expect, test } from "vitest"
import { readJobPreferences, writeJobWebSearchPreference } from "./preferences"

afterEach(() => {
  localStorage.clear()
})

test("defaults a new job to web search when nothing is stored", () => {
  expect(readJobPreferences()).toEqual({ webSearch: true })
})

test("remembers the last web-search choice for the next new job", () => {
  writeJobWebSearchPreference(false)

  expect(readJobPreferences()).toEqual({ webSearch: false })
})
