// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { StrictMode } from "react"
import { afterEach, expect, test, vi } from "vitest"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Markdown } from "."
import { completeMarkdown } from "./parse"

vi.mock("@tanstack/react-router", async () => ({
  ...(await import("../../../../test/router")),
  ...(await import("../../../../test/routing")),
}))

afterEach(cleanup)

function renderMarkdown(text: string, streaming = false) {
  return render(
    <TooltipProvider>
      <Markdown streaming={streaming} text={text} />
    </TooltipProvider>
  )
}

test("StrictMode leaves one prefetch scheduled and unmount cancels it", () => {
  vi.useFakeTimers()
  try {
    const view = render(
      <StrictMode>
        <Markdown text="A short reply." />
      </StrictMode>
    )

    expect(vi.getTimerCount()).toBe(1)
    view.unmount()
    expect(vi.getTimerCount()).toBe(0)
  } finally {
    cleanup()
    vi.useRealTimers()
  }
})

test("lays out a table with its alignment and inline runs", () => {
  renderMarkdown(
    "| Customer | Renews |\n|:---|---:|\n| **Harbor House** | Sep 24 |\n| Beacon Works | Oct 2 |"
  )

  expect(screen.getAllByRole("columnheader")).toHaveLength(2)
  expect(screen.getAllByRole("row")).toHaveLength(3)
  expect(
    screen.getByRole("columnheader", { name: "Renews" }).style.textAlign
  ).toBe("right")
  expect(screen.getByText("Harbor House").tagName).toBe("STRONG")
})

test("highlights a fence in a known language and offers to copy it", async () => {
  const { container } = renderMarkdown('```json\n{ "paid": false }\n```')

  // The grammars arrive on their own; the block reads plain until then.
  await waitFor(() =>
    expect(container.querySelector("pre code .hljs-attr")?.textContent).toBe(
      '"paid"'
    )
  )
  expect(screen.getByRole("button", { name: "Copy code" })).toBeDefined()
})

test("a fence in an unknown language is plain text, and inline code keeps its characters", () => {
  const { container } = renderMarkdown("```brainfuck\n+++\n```\n\nUse `a < b`.")

  expect(container.querySelector("pre code")?.textContent).toBe("+++")
  expect(container.querySelector("pre code span")).toBeNull()
  expect(container.querySelector("p code")?.textContent).toBe("a < b")
})

test("links into the console stay in it; links out open a new tab; other schemes are text", () => {
  renderMarkdown(
    "See [the table](/tables/collections_renewals), [the docs](https://usejori.com/docs), or [nothing](javascript:alert(1))."
  )

  const inside = screen.getByRole("link", { name: "the table" })
  const outside = screen.getByRole("link", { name: "the docs" })

  expect(inside.getAttribute("href")).toBe("/tables/collections_renewals")
  expect(inside.getAttribute("target")).toBeNull()
  expect(outside.getAttribute("target")).toBe("_blank")
  expect(outside.getAttribute("rel")).toBe("noopener noreferrer")
  expect(screen.queryByRole("link", { name: "nothing" })).toBeNull()
  expect(screen.getAllByRole("link")).toHaveLength(2)
})

test("markup in the text is shown as text, and entities are resolved", () => {
  const { container } = renderMarkdown(
    '<img src=x onerror="alert(1)"> fish &amp; chips'
  )

  expect(container.querySelector("img")).toBeNull()
  expect(container.textContent).toContain('<img src=x onerror="alert(1)">')
  expect(container.textContent).toContain("fish & chips")
})

test("lists, task items, and headings take their elements", () => {
  renderMarkdown("## Next\n\n1. Remind\n2. Update\n\n- [x] Done\n- [ ] Open")

  expect(screen.getByRole("heading", { level: 2 }).textContent).toBe("Next")
  expect(screen.getAllByRole("listitem")).toHaveLength(4)
  expect(screen.getByRole("checkbox", { name: "Done" })).toBeDefined()
})

test("an open fence is code whether or not the reply is still streaming", () => {
  const { container } = renderMarkdown("```ts\nconst x = 1", true)

  expect(container.querySelector("pre code")?.textContent).toBe("const x = 1")

  cleanup()

  const finished = renderMarkdown("```ts\nconst x = 1")

  expect(finished.container.querySelector("pre code")?.textContent).toBe(
    "const x = 1"
  )
})

test("while streaming, a lone table header is a table already", () => {
  renderMarkdown("| Customer | Ren", true)

  expect(screen.getAllByRole("columnheader")).toHaveLength(2)
  expect(completeMarkdown("| a |\n| - |\n| 1")).toBe("| a |\n| - |\n| 1")

  cleanup()
  renderMarkdown("| Customer | Ren")

  expect(screen.queryByRole("table")).toBeNull()
})
