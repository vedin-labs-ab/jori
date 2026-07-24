// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, expect, test } from "vitest"
import { type AppSummary } from "../types"
import { DeleteAppDialog } from "./delete"

afterEach(() => {
  cleanup()
})

test("confirms archiving active apps", () => {
  render(
    <DeleteAppDialog
      app={app({ archivedAt: undefined })}
      isDeleting={false}
      onDelete={() => undefined}
      open
    />
  )

  expect(screen.getByText('Archive "App"?')).toBeDefined()
  expect(screen.getByRole("button", { name: "Archive app" })).toBeDefined()
  expect(
    screen.getByText(/removes the app from the active list/i)
  ).toBeDefined()
})

test("confirms permanent deletion for archived apps", () => {
  render(
    <DeleteAppDialog
      app={app({ archivedAt: 1 })}
      isDeleting={false}
      onDelete={() => undefined}
      open
    />
  )

  expect(screen.getByText('Delete "App"?')).toBeDefined()
  expect(screen.getByRole("button", { name: "Delete app" })).toBeDefined()
  expect(screen.getByText(/permanently deletes the app/i)).toBeDefined()
})

function app({ archivedAt }: { archivedAt: number | undefined }): AppSummary {
  return {
    access: "personal",
    archivedAt,
    appId: "app",
    automations: [],
    capabilities: [],
    createdAt: 1,
    ownerId: "user",
    title: "App",
    updatedAt: 1,
    versionId: undefined,
    versions: [],
  } as unknown as AppSummary
}
