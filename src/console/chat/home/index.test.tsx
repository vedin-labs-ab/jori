// @vitest-environment jsdom
import { tiers } from "@contracts/models/selection"
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { type ComponentProps } from "react"
import { afterEach, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { typeInto } from "../../../../test/editor"
import { type ConsolePage } from "../../page"
import { useAvailableModels } from "../models"
import { ChatHomePage } from "."

const { send, navigate } = vi.hoisted(() => ({
  send: vi.fn(),
  navigate: vi.fn(),
}))

vi.mock("../../page", () => ({
  ConsolePage: ({ children }: ComponentProps<typeof ConsolePage>) =>
    children("organization"),
}))
vi.mock("../models", () => ({ useAvailableModels: vi.fn() }))
vi.mock("../send", () => ({ useSendMessage: () => send }))
vi.mock("../recent", () => ({
  recentCount: 5,
  useRecentConversations: () => [],
}))
vi.mock("../mentions", () => ({ useMentionSources: () => undefined }))
vi.mock("./entry", () => ({
  useChatEntry: () => ({ folderId: null, folders: [], select: vi.fn() }),
}))
vi.mock("@/shared/console/shell/location", () => ({
  useConsoleNavigate: () => navigate,
}))
vi.mock("@/shared/console/chat/composer/placeholder", () => ({
  TypedPlaceholder: () => "Tell Jori what needs doing",
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test.each([undefined, [], [tiers.premium.model]])(
  "the home accepts a draft and retries a failed send with catalog %j",
  async (models) => {
    vi.mocked(useAvailableModels).mockReturnValue(models)
    send.mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce({
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
    fireEvent.click(screen.getByRole("button", { name: "Send message" }))
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Send message" })).toBeDefined()
    )
    expect(field.textContent).toBe("Chase the invoices")
    expect(navigate).not.toHaveBeenCalled()

    fireEvent.keyDown(field, { key: "Enter" })
    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1))
    expect(send).toHaveBeenCalledTimes(2)
    expect(send).toHaveBeenLastCalledWith({
      text: "Chase the invoices",
      model: tiers.standard,
    })
    await waitFor(() => expect(field.textContent).toBe(""))
  }
)
