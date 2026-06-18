// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { type ArtifactSummary } from "../types"
import { DeleteArtifactDialog } from "./delete"

afterEach(() => {
  cleanup()
})

test("confirms archiving active artifacts", () => {
  render(
    <DeleteArtifactDialog
      artifact={artifact({ archivedAt: undefined })}
      isDeleting={false}
      onDelete={() => undefined}
      open
    />
  )

  expect(screen.getByText('Archive "Artifact"?')).toBeDefined()
  expect(screen.getByRole("button", { name: "Archive artifact" })).toBeDefined()
  expect(
    screen.getByText(/removes the artifact from the active list/i)
  ).toBeDefined()
})

test("confirms permanent deletion for archived artifacts", () => {
  render(
    <DeleteArtifactDialog
      artifact={artifact({ archivedAt: 1 })}
      isDeleting={false}
      onDelete={() => undefined}
      open
    />
  )

  expect(screen.getByText('Delete "Artifact"?')).toBeDefined()
  expect(screen.getByRole("button", { name: "Delete artifact" })).toBeDefined()
  expect(screen.getByText(/permanently deletes the artifact/i)).toBeDefined()
})

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
