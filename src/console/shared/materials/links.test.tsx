// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { type FunctionReference, getFunctionName } from "convex/server"
import { type GenericId } from "convex/values"
import { toast } from "sonner"
import { afterEach, beforeEach, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { sharePageSize } from "@/shared/console/materials/history"
import { MaterialLinksDialog } from "./links"

const mutation = vi.fn()
const page = vi.fn()
const copy = vi.fn()

vi.mock("convex/react", () => ({
  useMutation: (reference: FunctionReference<"mutation">) => (args: unknown) =>
    mutation(getFunctionName(reference), args),
  usePaginatedQuery: (
    reference: FunctionReference<"query">,
    ...args: unknown[]
  ) => {
    page(getFunctionName(reference), ...args)
    return {
      results: [
        {
          shareId: "share-1",
          createdAt: Date.now(),
          expiresAt: Date.now() + 60_000,
        },
      ],
      status: "Exhausted",
      loadMore: vi.fn(),
    }
  },
}))
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock("@/shared/console/copy/text", () => ({
  copyText: (value: string) => copy(value),
}))

afterEach(cleanup)
beforeEach(() => {
  vi.clearAllMocks()
  mutation.mockResolvedValue({
    url: "https://jori.example/shared#secret",
    urlPath: "/shared#secret",
    expiresAt: Date.now() + 60_000,
  })
  copy.mockResolvedValue(true)
})

const targets = [
  { kind: "file", id: "file-1" as GenericId<"files"> },
  { kind: "store", id: "store-1" as GenericId<"collections"> },
  { kind: "table", id: "table-1" as GenericId<"collections"> },
] as const

test.each(targets)(
  "$kind share links load, create, copy, and revoke for their own material",
  async (target) => {
    const dialog = (open: boolean) => (
      <TooltipProvider>
        <MaterialLinksDialog
          onOpenChange={() => undefined}
          open={open}
          organizationId="org-1"
          target={target}
        />
      </TooltipProvider>
    )
    const { rerender } = render(dialog(false))
    const endpoint = `${target.kind}s/share`
    const args = { organizationId: "org-1", [`${target.kind}Id`]: target.id }
    expect(page).toHaveBeenLastCalledWith(`${endpoint}:page`, "skip", {
      initialNumItems: sharePageSize,
    })

    rerender(dialog(true))
    expect(screen.getByRole("dialog", { name: "Share links" })).toBeDefined()
    expect(
      screen.getByText(
        `Anyone with a link can view this ${target.kind} until the link expires or is revoked.`
      )
    ).toBeDefined()
    expect(page).toHaveBeenLastCalledWith(`${endpoint}:page`, args, {
      initialNumItems: sharePageSize,
    })

    fireEvent.click(screen.getByRole("button", { name: "Create link" }))
    await screen.findByText("https://jori.example/shared#secret")
    expect(mutation).toHaveBeenCalledWith(`${endpoint}:create`, {
      ...args,
      expiresInHours: 72,
    })
    fireEvent.click(screen.getByRole("button", { name: "Copy share link" }))
    await waitFor(() =>
      expect(copy).toHaveBeenCalledWith("https://jori.example/shared#secret")
    )
    fireEvent.click(screen.getByRole("button", { name: "Revoke" }))
    await waitFor(() =>
      expect(mutation).toHaveBeenCalledWith(`${endpoint}:revoke`, {
        ...args,
        shareId: "share-1",
      })
    )

    mutation.mockRejectedValueOnce(new Error("Sharing is unavailable."))
    fireEvent.click(screen.getByRole("button", { name: "Create link" }))
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Sharing is unavailable.")
    )
    rerender(dialog(false))
    expect(page).toHaveBeenLastCalledWith(`${endpoint}:page`, "skip", {
      initialNumItems: sharePageSize,
    })
  }
)
