// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { type AppSummary } from "../types"
import { AppActions } from "./actions"

afterEach(() => {
  cleanup()
})

test("shows archive action for active apps", () => {
  renderActions(app({ archivedAt: undefined }))

  openMenu()

  expect(screen.getByRole("menuitem", { name: "Archive" })).toBeDefined()
  expect(screen.queryByRole("menuitem", { name: "Restore" })).toBeNull()
})

test("shows restore and delete actions for archived apps", () => {
  const onRestore = vi.fn()

  renderActions(app({ archivedAt: 1 }), { onRestore })

  openMenu()
  expect(screen.getByRole("menuitem", { name: "Delete" })).toBeDefined()
  fireEvent.click(screen.getByRole("menuitem", { name: "Restore" }))

  expect(onRestore).toHaveBeenCalledOnce()
})

function renderActions(
  app: AppSummary,
  overrides: {
    onRestore?: (app: AppSummary) => void
  } = {}
) {
  return render(
    <AppActions
      app={app}
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
