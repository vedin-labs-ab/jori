// @vitest-environment jsdom
import { Editor } from "@tiptap/core"
import { afterEach, expect, test } from "vitest"
import { createInstructionMarkdownExtensions } from "./extensions"

const editors: Editor[] = []

afterEach(() => {
  for (const editor of editors) {
    editor.destroy()
  }
  editors.length = 0
})

test.each([
  "``` ",
  "```txt ",
  "```text ",
  "```plaintext ",
  "````txt ",
  "   ```txt ",
])("turns the typed %j opener into a plain fenced block", (opener) => {
  const editor = createEditor()

  typeText(editor, opener)

  expect(editor.getJSON().content?.[0]?.type).toBe("fencedText")
})

test("accepts Enter after a plain tilde fence opener", () => {
  const editor = createEditor()

  typeText(editor, "~~~text")
  pressEnter(editor)

  expect(editor.getJSON().content?.[0]?.type).toBe("fencedText")
})

test.each(["````json ", "   ```json "])(
  "turns the typed %j opener into a programming block",
  (opener) => {
    const editor = createEditor()

    typeText(editor, opener)

    expect(editor.getJSON().content?.[0]).toMatchObject({
      attrs: { language: "json" },
      type: "codeBlock",
    })
  }
)

test("does not treat four-space indentation as a fenced block", () => {
  const editor = createEditor()

  typeText(editor, "    ```txt ")

  expect(editor.getJSON().content?.[0]?.type).toBe("paragraph")
})

test("starts a fenced block after a soft break", () => {
  const editor = createEditor()

  pressKey(editor, "Enter", { shiftKey: true })
  typeText(editor, "```txt ")

  expect(documentNodeTypes(editor)).toEqual(["paragraph", "fencedText"])
  expect(editor.state.selection.$from.parent.type.name).toBe("fencedText")
})

test("preserves the language when starting code after a soft break", () => {
  const editor = createEditor()

  pressKey(editor, "Enter", { shiftKey: true })
  typeText(editor, "```json ")

  expect(editor.getJSON().content?.[1]).toMatchObject({
    attrs: { language: "json" },
    type: "codeBlock",
  })
})

test("keeps prose before a soft-break fence", () => {
  const editor = createEditor()

  typeText(editor, "Keep this")
  pressKey(editor, "Enter", { shiftKey: true })
  typeText(editor, "```txt ")

  expect(editor.getJSON().content?.[0]?.content?.[0]).toMatchObject({
    text: "Keep this",
    type: "text",
  })
  expect(documentNodeTypes(editor)).toEqual(["paragraph", "fencedText"])
})

test.each(["```txt ", "```json "])(
  "does not append a cursor paragraph after the final %j block",
  (opener) => {
    const editor = createEditor()

    typeText(editor, opener)

    expect(editor.getJSON().content).toHaveLength(1)
  }
)

test("creates a following paragraph only when leaving the fenced block", () => {
  const editor = createEditor()

  typeText(editor, "```txt hello")
  pressKey(editor, "ArrowDown")

  expect(documentNodeTypes(editor)).toEqual(["fencedText", "paragraph"])
  expect(editor.state.selection.$from.parent.type.name).toBe("paragraph")
})

test("exits a fenced block on the standard third Enter", () => {
  const editor = createEditor()

  typeText(editor, "```txt hello")
  pressEnter(editor)
  pressEnter(editor)
  pressEnter(editor)

  expect(documentNodeTypes(editor)).toEqual(["fencedText", "paragraph"])
  expect(editor.state.selection.$from.parent.type.name).toBe("paragraph")
})

test("removes an explicit following paragraph without deleting the block", () => {
  const editor = createEditor()

  typeText(editor, "```txt hello")
  pressKey(editor, "ArrowDown")
  pressKey(editor, "Backspace")

  expect(documentNodeTypes(editor)).toEqual(["fencedText"])
  expect(editor.state.selection.$from.parent.type.name).toBe("fencedText")
})

function createEditor() {
  const editor = new Editor({
    extensions: createInstructionMarkdownExtensions(),
  })
  editors.push(editor)
  return editor
}

function typeText(editor: Editor, value: string) {
  for (const character of value) {
    const { from, to } = editor.state.selection
    const handled = editor.view.someProp("handleTextInput", (handler) =>
      handler(editor.view, from, to, character, () =>
        editor.state.tr.insertText(character, from, to)
      )
    )

    if (!handled) {
      editor.view.dispatch(editor.state.tr.insertText(character, from, to))
    }
  }
}

function pressEnter(editor: Editor) {
  pressKey(editor, "Enter")
}

function pressKey(
  editor: Editor,
  key: string,
  options: KeyboardEventInit = {}
) {
  const event = new KeyboardEvent("keydown", { key, ...options })
  const handled = editor.view.someProp("handleKeyDown", (handler) =>
    handler(editor.view, event)
  )

  if (!handled && key === "Enter") {
    editor.commands.enter()
  }
}

function documentNodeTypes(editor: Editor) {
  return editor.getJSON().content?.map((node) => node.type)
}
