// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { type ArtifactSummary } from "../types"
import { ArtifactActions } from "./actions"

afterEach(() => {
  cleanup()
})

test("shows archive action for active artifacts", () => {
  renderActions(artifact({ archivedAt: undefined }))

  openMenu()

  expect(screen.getByRole("menuitem", { name: "Archive" })).toBeDefined()
  expect(screen.queryByRole("menuitem", { name: "Restore" })).toBeNull()
})

test("shows restore and delete actions for archived artifacts", () => {
  const onRestore = vi.fn()

  renderActions(artifact({ archivedAt: 1 }), { onRestore })

  openMenu()
  expect(screen.getByRole("menuitem", { name: "Delete" })).toBeDefined()
  fireEvent.click(screen.getByRole("menuitem", { name: "Restore" }))

  expect(onRestore).toHaveBeenCalledOnce()
})

function renderActions(
  artifact: ArtifactSummary,
  overrides: {
    onRestore?: (artifact: ArtifactSummary) => void
  } = {}
) {
  return render(
    <ArtifactActions
      artifact={artifact}
      isDeleting={false}
      isRestoring={false}
      onDelete={() => undefined}
      onRestore={overrides.onRestore ?? (() => undefined)}
    />
  )
}

function openMenu() {
  fireEvent.pointerDown(screen.getByRole("button", { name: /open actions/i }), {
    button: 0,
    ctrlKey: false,
  })
}

function artifact({
  archivedAt,
}: {
  archivedAt: number | undefined
}): ArtifactSummary {
  return {
    access: "personal",
    archivedAt,
    artifactId: "artifact",
    automations: [],
    capabilities: [],
    createdAt: 1,
    ownerId: "user",
    title: "Artifact",
    updatedAt: 1,
    versionId: undefined,
    versions: [],
  } as unknown as ArtifactSummary
}
