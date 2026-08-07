// @vitest-environment jsdom
import {
  getPlaybook,
  type PlaybookDefinition,
} from "@contracts/playbooks/catalog"
import { resolvePlaybookOptions } from "@contracts/playbooks/options"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { PlaybookConfiguration } from "./index"

afterEach(() => {
  cleanup()
})

test("fields with names of their own replace the section heading", () => {
  renderConfiguration(getPlaybook("preread"))

  expect(screen.getByText("Day")).toBeDefined()
  expect(screen.getByText("Ready by")).toBeDefined()
  expect(screen.queryByText("Schedule")).toBeNull()
})

test("a lone field named like its section leans on the heading", () => {
  renderConfiguration(getPlaybook("meeting-briefing"))

  expect(screen.getAllByText("Meetings")).toHaveLength(1)
})

function renderConfiguration(definition: PlaybookDefinition) {
  const setup = definition.setup ?? []

  return render(
    <PlaybookConfiguration
      disabled={false}
      onChange={() => {}}
      setup={setup}
      values={resolvePlaybookOptions(setup)}
    />
  )
}
