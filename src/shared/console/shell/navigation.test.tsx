// @vitest-environment jsdom
import { DndContext, PointerSensor, useSensor, useSensors } from "@dnd-kit/core"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { type ReactNode } from "react"
import { afterEach, expect, test, vi } from "vitest"
import { SidebarProvider } from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import { dragActivationDistance } from "../folders/drag/plan"
import { ConsoleNavigationContext } from "./location"
import { ConsoleSidebar } from "./navigation"

vi.mock("@tanstack/react-router", async () => ({
  ...(await import("../../../../test/router")),
  ...(await import("../../../../test/routing")),
}))

afterEach(() => {
  cleanup()
  window.localStorage.clear()

  if (vi.isFakeTimers()) {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  }
})

const chats = [
  {
    id: "conversations_renewals",
    title: "Renewals at risk",
    updatedAt: 2,
    visibility: "organization" as const,
  },
  {
    id: "conversations_flaky",
    title: "Flaky payroll test",
    updatedAt: 1,
    visibility: "organization" as const,
  },
]

function renderSidebar(
  pathname: string,
  conversations = chats,
  options: {
    open?: boolean
    navigate?: (href: string) => void
    onDragStart?: () => void
  } = {}
) {
  function DragSurface({
    children,
    onDragStart,
  }: {
    children: ReactNode
    onDragStart?: () => void
  }) {
    const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: { distance: dragActivationDistance },
      })
    )

    return (
      <DndContext onDragStart={onDragStart} sensors={sensors}>
        {children}
      </DndContext>
    )
  }

  return render(
    <TooltipProvider>
      <ConsoleNavigationContext.Provider
        value={{ navigate: options.navigate ?? (() => undefined), pathname }}
      >
        <DragSurface onDragStart={options.onDragStart}>
          <SidebarProvider open={options.open ?? true}>
            <ConsoleSidebar
              account={null}
              chats={conversations}
              folders={null}
              organization={null}
              pathname={pathname}
            />
          </SidebarProvider>
        </DragSurface>
      </ConsoleNavigationContext.Provider>
    </TooltipProvider>
  )
}

test("dragging a sidebar chat carries its current folder without navigating", () => {
  vi.useFakeTimers()
  const onDragStart = vi.fn()
  const navigate = vi.fn()
  const chat = { ...chats[0], folderId: "finance" }

  renderSidebar("/chat", [chat], { onDragStart, navigate })
  const link = screen.getByRole("link", { name: chat.title })

  fireEvent.pointerDown(link, {
    button: 0,
    clientX: 10,
    clientY: 10,
    isPrimary: true,
    pointerId: 1,
  })
  fireEvent.pointerMove(document, {
    clientX: 10 + dragActivationDistance + 1,
    clientY: 10,
    pointerId: 1,
  })

  expect(onDragStart).toHaveBeenCalledOnce()
  expect(onDragStart.mock.calls[0]?.[0].active.data.current).toEqual({
    folders: [],
    resources: [
      { type: "chat", id: chat.id, name: chat.title, folderId: "finance" },
    ],
  })
  fireEvent.pointerUp(document, { pointerId: 1 })
  fireEvent.click(link, { detail: 1 })
  expect(navigate).not.toHaveBeenCalled()
})

test.each(["/chat/conversations_flaky", "/chat/conversations_flaky/"])(
  "the current chat is active at %s, between Activity and resources",
  (pathname) => {
    renderSidebar(pathname)

    const links = screen.getAllByRole("link").map((link) => link.textContent)

    expect(links.slice(0, 5)).toEqual([
      "New chat",
      "Activity",
      "Renewals at risk",
      "Flaky payroll test",
      "Jobs",
    ])
    expect(screen.getByText("Chats")).toBeDefined()
    expect(
      screen
        .getByRole("link", { name: "Flaky payroll test" })
        .getAttribute("href")
    ).toBe("/chat/conversations_flaky")
    expect(
      screen
        .getByRole("link", { name: "Flaky payroll test" })
        .getAttribute("data-active")
    ).toBe("true")
    expect(
      screen
        .getByRole("link", { name: "Renewals at risk" })
        .getAttribute("data-active")
    ).toBe("false")
    expect(
      screen.getByRole("link", { name: "New chat" }).getAttribute("data-active")
    ).toBe("false")
  }
)

test("New chat is active on /chat itself", () => {
  renderSidebar("/chat")

  expect(
    screen.getByRole("link", { name: "New chat" }).getAttribute("data-active")
  ).toBe("true")
  expect(
    screen.getByRole("link", { name: "Activity" }).getAttribute("data-active")
  ).toBe("false")
})

test("without conversations there is no Chats group at all", () => {
  renderSidebar("/runs", [])

  expect(screen.queryByText("Chats")).toBeNull()
})

test("Chats and Resources close from their labels, and stay closed on the next visit", () => {
  const { unmount } = renderSidebar("/chat")

  fireEvent.click(screen.getByRole("button", { name: "Resources" }))

  expect(screen.queryByRole("link", { name: "Jobs" })).toBeNull()
  expect(screen.getByRole("link", { name: "Renewals at risk" })).toBeDefined()
  expect(
    screen
      .getByRole("button", { name: "Resources" })
      .getAttribute("aria-expanded")
  ).toBe("false")

  fireEvent.click(screen.getByRole("button", { name: "Chats" }))

  expect(screen.queryByRole("link", { name: "Renewals at risk" })).toBeNull()

  unmount()
  renderSidebar("/chat")

  expect(screen.queryByRole("link", { name: "Jobs" })).toBeNull()
  expect(screen.queryByRole("link", { name: "Renewals at risk" })).toBeNull()

  fireEvent.click(screen.getByRole("button", { name: "Resources" }))

  expect(screen.getByRole("link", { name: "Jobs" })).toBeDefined()
})

test.each(["/chat/conversations_flaky", "/chat/conversations_flaky/"])(
  "the icon rail marks Chats active at %s and opens a searchable list",
  (pathname) => {
    const navigate = vi.fn()

    renderSidebar(pathname, chats, { open: false, navigate })

    const entry = screen.getByRole("button", { name: "Chats" })

    expect(entry.getAttribute("data-active")).toBe("true")

    fireEvent.click(entry)
    fireEvent.change(screen.getByPlaceholderText("Search chats…"), {
      target: { value: "payroll" },
    })

    expect(
      screen.queryByRole("option", { name: "Renewals at risk" })
    ).toBeNull()

    fireEvent.click(screen.getByRole("option", { name: "Flaky payroll test" }))

    expect(navigate).toHaveBeenCalledWith("/chat/conversations_flaky")
    expect(screen.queryByPlaceholderText("Search chats…")).toBeNull()
  }
)
