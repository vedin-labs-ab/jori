import { expect, test } from "vitest"
import { resolveLanguage } from "./language"

test("filenames resolve through the bundled catalog", () => {
  expect(resolveLanguage("main.ts", "text/plain")?.name).toBe("TypeScript")
  expect(resolveLanguage("app.tsx", "")?.name).toBe("TSX")
  expect(resolveLanguage("script.py", "")?.name).toBe("Python")
  expect(resolveLanguage("Main.java", "application/octet-stream")?.name).toBe(
    "Java"
  )
  expect(resolveLanguage("config.json", "text/plain")?.name).toBe("JSON")
  expect(resolveLanguage("notes.md", "")?.name).toBe("Markdown")
})

test("the mime type resolves when the filename has no extension", () => {
  expect(resolveLanguage("payload", "application/json")?.name).toBe("JSON")
  expect(resolveLanguage("notes", "text/markdown")?.name).toBe("Markdown")
  expect(resolveLanguage("script", "text/x-python")?.name).toBe("Python")
  expect(resolveLanguage("graph", "application/ld+json")?.name).toBe("JSON")
})

test("the filename wins over a mismatched mime type", () => {
  expect(resolveLanguage("main.rs", "text/plain")?.name).toBe("Rust")
})

test("unmatched files stay plain text", () => {
  expect(resolveLanguage("notes.txt", "text/plain")).toBeNull()
  expect(resolveLanguage("blob.bin", "application/octet-stream")).toBeNull()
  expect(resolveLanguage("README", "")).toBeNull()
})
