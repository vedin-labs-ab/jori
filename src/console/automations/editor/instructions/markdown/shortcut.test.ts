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

test.each([
  "````json ",
  "   ```json ",
])("turns the typed %j opener into a programming block", (opener) => {
  const editor = createEditor()

  typeText(editor, opener)

  expect(editor.getJSON().content?.[0]).toMatchObject({
    attrs: { language: "json" },
    type: "codeBlock",
  })
})

test("does not treat four-space indentation as a fenced block", () => {
  const editor = createEditor()

  typeText(editor, "    ```txt ")

  expect(editor.getJSON().content?.[0]?.type).toBe("paragraph")
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
  const event = new KeyboardEvent("keydown", { key: "Enter" })
  const handled = editor.view.someProp("handleKeyDown", (handler) =>
    handler(editor.view, event)
  )

  if (!handled) {
    editor.commands.enter()
  }
}
