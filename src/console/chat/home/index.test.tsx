// @vitest-environment jsdom
import { tiers } from "@contracts/models/selection"
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { type ComponentProps } from "react"
import { toast } from "sonner"
import { afterEach, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { typeInto } from "../../../../test/editor"
import { type ConsolePage } from "../../page"
import { useAvailableModels } from "../models"
import { ChatHomePage } from "."

const { send, navigate, query } = vi.hoisted(() => ({
  send: vi.fn(),
  navigate: vi.fn(),
  query: vi.fn(),
}))

vi.mock("../../page", () => ({
  ConsolePage: ({ children }: ComponentProps<typeof ConsolePage>) =>
    children("organization"),
}))
vi.mock("../models", () => ({ useAvailableModels: vi.fn() }))
vi.mock("convex/react", () => ({
  useQuery: (...args: unknown[]) => query(...args),
  useMutation: () => Object.assign(send, { withOptimisticUpdate: () => send }),
  insertAtTop: vi.fn(),
}))
vi.mock("sonner", () => ({ toast: { error: vi.fn(), warning: vi.fn() } }))
vi.mock("../recent", () => ({
  recentCount: 5,
  useRecentConversations: () => [],
}))
vi.mock("../mentions", () => ({ useMentionSources: () => undefined }))
vi.mock("@/shared/console/shell/location", () => ({
  useConsoleNavigate: () => navigate,
}))
vi.mock("@/shared/console/chat/composer/placeholder", () => ({
  TypedPlaceholder: () => "Tell Jori what needs doing",
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  send.mockReset()
  query.mockReset()
})

test.each([
  { models: undefined, error: new Error("Offline"), message: "Offline" },
  {
    models: [],
    error: new Error("Request timed out."),
    message: "Request timed out.",
  },
  {
    models: [tiers.premium.model],
    error: new Error("Choose another model."),
    message: "Choose another model.",
  },
  {
    models: [tiers.standard.model],
    error: new Error("You no longer have access."),
    message: "You no longer have access.",
  },
  {
    models: [],
    error: new Error("Server Error: internal detail"),
    message: "Couldn't send your message.",
  },
  {
    models: [],
    error: { code: "unavailable" },
    message: "Couldn't send your message.",
  },
])(
  "a failed send toasts once, preserves the draft, and can be retried: $message",
  async ({ models, error, message }) => {
    vi.mocked(useAvailableModels).mockReturnValue(models)
    send.mockRejectedValueOnce(error).mockResolvedValueOnce({
      conversationId: "conversation",
      status: "sent",
    })
    render(
      <TooltipProvider>
        <ChatHomePage />
      </TooltipProvider>
    )
    const field = await screen.findByRole("textbox", { name: "Message" })
    expect(field.getAttribute("contenteditable")).toBe("true")
    expect(
      screen.queryByText(/model choices|available in this region/i)
    ).toBeNull()
    typeInto(field, "Chase the invoices")
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send message" }))
    })
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Send message" })).toBeDefined()
    )
    expect(field.textContent).toBe("Chase the invoices")
    expect(toast.error).toHaveBeenCalledExactlyOnceWith(message)
    expect(
      screen.getByRole("button", { name: "Mention a resource" })
    ).toBeDefined()
    expect(navigate).not.toHaveBeenCalled()

    await act(async () => {
      fireEvent.keyDown(field, { key: "Enter" })
    })
    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1))
    expect(send).toHaveBeenCalledTimes(2)
    expect(send).toHaveBeenLastCalledWith({
      text: "Chase the invoices",
      model: tiers.standard,
      organizationId: "organization",
    })
    await waitFor(() => expect(field.textContent).toBe(""))
  }
)

test.each([
  {
    entry: undefined,
    message: "This resource is still loading. Try sending again in a moment.",
  },
  {
    entry: [{ kind: "folder", id: "folder", unavailable: true }],
    message:
      "This resource is no longer available. Open a new chat to continue.",
  },
])(
  "resource checks wait for submit and recover without losing the draft: $message",
  async ({ entry, message }) => {
    // The two subscriptions keep their values across editor rerenders.
    query.mockImplementation((_function, args) =>
      args?.targets ? entry : { status: "ready", folders: [] }
    )
    const context = { kind: "folder", id: "folder" } as const
    const view = render(
      <TooltipProvider>
        <ChatHomePage context={context} />
      </TooltipProvider>
    )
    const field = await screen.findByRole("textbox", { name: "Message" })
    expect(field.getAttribute("contenteditable")).toBe("true")
    expect(screen.queryByText(message)).toBeNull()
    expect(toast.error).not.toHaveBeenCalled()
    typeInto(field, "Keep this prompt")
    await act(async () => {
      fireEvent.keyDown(field, { key: "Enter" })
    })
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledExactlyOnceWith(message)
    )
    expect(send).not.toHaveBeenCalled()
    expect(field.textContent).toBe("Keep this prompt")
    expect(
      screen.getByRole("button", { name: "Mention a resource" })
    ).toBeDefined()
    await waitFor(() =>
      expect(field.getAttribute("contenteditable")).toBe("true")
    )

    query.mockImplementation((_function, args) =>
      args?.targets
        ? [{ ...context, name: "Reports", unavailable: false }]
        : { status: "ready", folders: [] }
    )
    send.mockResolvedValueOnce({
      status: "sent",
      conversationId: "conversation",
    })
    view.rerender(
      <TooltipProvider>
        <ChatHomePage context={context} />
      </TooltipProvider>
    )
    expect(screen.getByRole("textbox", { name: "Message" })).toBe(field)
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Send message" }))
    })
    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1))
    expect(send).toHaveBeenCalledExactlyOnceWith({
      organizationId: "organization",
      model: tiers.standard,
      text: "Keep this prompt",
      folderId: "folder",
    })
    expect(toast.error).toHaveBeenCalledTimes(1)
  }
)
