// @vitest-environment jsdom
import { type Hit } from "@contracts/discovery"
import { act, cleanup, renderHook } from "@testing-library/react"
import { afterEach, expect, test, vi } from "vitest"
import { useOpenHit } from "./open"

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  navigate: vi.fn(),
  error: vi.fn(),
}))
vi.mock("convex/react", () => ({ useConvex: () => ({ query: mocks.query }) }))
vi.mock("sonner", () => ({ toast: { error: mocks.error } }))
vi.mock("@/shared/console/shell/location", () => ({
  useConsoleNavigate: () => mocks.navigate,
}))
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})
const hit: Hit = {
  candidate: { key: "files:report", revision: "1", part: 0, score: 1 },
  kind: "file",
  resourceId: "report",
  title: "Report",
  resourceName: "Report",
  snippet: "Report",
  location: { kind: "resource", id: "report" },
}
const initialProps = { org: "one", text: "report", open: true }
function setup() {
  const close = vi.fn()
  const hook = renderHook(
    ({ org, text, open }) => useOpenHit(org, text, open, close),
    { initialProps }
  )
  return { hook, close }
}
function defer() {
  let resolve: (hits: Hit[]) => void = () => undefined
  mocks.query.mockReturnValueOnce(
    new Promise<Hit[]>((done) => {
      resolve = done
    })
  )
  return resolve
}

test.each([
  { ...initialProps, open: false },
  { ...initialProps, text: "something else" },
  { ...initialProps, org: "two" },
])(
  "a late permission check cannot navigate after the search changes: %j",
  async (next) => {
    const resolve = defer()
    const { hook, close } = setup()
    const request = hook.result.current(hit)
    hook.rerender(next)
    await act(async () => {
      resolve([hit])
      await request
    })
    expect(mocks.navigate).not.toHaveBeenCalled()
    expect(close).not.toHaveBeenCalled()
  }
)

test("only the latest selection navigates, after checking current access", async () => {
  const first = defer(),
    second = defer()
  const { hook, close } = setup()
  const older = hook.result.current(hit)
  const newerHit = { ...hit, resourceId: "newer" }
  const newer = hook.result.current(newerHit)
  await act(async () => {
    second([newerHit])
    await newer
    first([hit])
    await older
  })
  expect(mocks.navigate).toHaveBeenCalledExactlyOnceWith({
    to: "/files/$fileId",
    params: { fileId: "newer" },
  })
  expect(close).toHaveBeenCalledOnce()
})

test("revoked access leaves the palette open and never navigates", async () => {
  mocks.query.mockResolvedValue([])
  const { hook, close } = setup()
  await act(() => hook.result.current(hit))
  expect(close).not.toHaveBeenCalled()
  expect(mocks.navigate).not.toHaveBeenCalled()
  expect(mocks.error).toHaveBeenCalledWith(
    "This result is no longer available."
  )
})

test("unmount cancels a pending selection", async () => {
  const resolve = defer()
  const { hook } = setup()
  const request = hook.result.current(hit)
  hook.unmount()
  await act(async () => {
    resolve([hit])
    await request
  })
  expect(mocks.navigate).not.toHaveBeenCalled()
})
