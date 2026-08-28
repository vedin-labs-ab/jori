import {
  Database,
  FileArchive,
  FileImage,
  FileJson,
  FileSpreadsheet,
  FileText,
} from "lucide-react"
import { expect, test } from "vitest"
import { fileKind } from "./kind"

test("media and documents resolve from the mime type alone", () => {
  expect(fileKind("image/png", "photo")).toMatchObject({
    category: "image",
    icon: FileImage,
    label: "Image",
  })
  expect(fileKind("image/svg+xml", "logo").label).toBe("SVG")
  expect(fileKind("video/mp4", "clip").label).toBe("Video")
  expect(fileKind("audio/mpeg", "song").label).toBe("Audio")
  expect(fileKind("application/pdf", "report")).toMatchObject({
    category: "document",
    label: "PDF",
  })
  expect(fileKind("font/woff2", "face").label).toBe("Font")
})

test("office formats cover legacy and OOXML mime types", () => {
  const ooxml = "application/vnd.openxmlformats-officedocument"

  expect(fileKind("application/msword", "old").label).toBe("Word")
  expect(fileKind(`${ooxml}.wordprocessingml.document`, "new").label).toBe(
    "Word"
  )
  expect(fileKind("application/vnd.ms-excel", "old")).toMatchObject({
    icon: FileSpreadsheet,
    label: "Excel",
  })
  expect(fileKind(`${ooxml}.spreadsheetml.sheet`, "new").label).toBe("Excel")
  expect(fileKind("application/vnd.ms-powerpoint", "old").label).toBe(
    "PowerPoint"
  )
  expect(fileKind(`${ooxml}.presentationml.presentation`, "new").label).toBe(
    "PowerPoint"
  )
})

test("archives and structured text resolve from the mime type", () => {
  expect(fileKind("application/zip", "bundle")).toMatchObject({
    category: "archive",
    icon: FileArchive,
    label: "Archive",
  })
  expect(fileKind("application/x-7z-compressed", "bundle").label).toBe(
    "Archive"
  )
  expect(fileKind("application/json", "data")).toMatchObject({
    category: "data",
    icon: FileJson,
    label: "JSON",
  })
  expect(fileKind("text/csv", "rows").label).toBe("CSV")
  expect(fileKind("text/tab-separated-values", "rows").label).toBe("TSV")
  expect(fileKind("text/markdown", "notes")).toMatchObject({
    icon: FileText,
    label: "Markdown",
  })
  expect(fileKind("application/yaml", "config").label).toBe("YAML")
  expect(fileKind("application/toml", "config").label).toBe("TOML")
  expect(fileKind("application/xml", "feed").label).toBe("XML")
})

test("structured-syntax suffixes fall back to their base format", () => {
  expect(fileKind("application/ld+json", "graph").label).toBe("JSON")
  expect(fileKind("application/atom+xml", "feed").label).toBe("XML")
  expect(fileKind("application/epub+zip", "book").label).toBe("Archive")
})

test("mime parameters and casing do not break matching", () => {
  expect(fileKind("text/markdown; charset=utf-8", "notes.md").label).toBe(
    "Markdown"
  )
  expect(fileKind("Application/PDF", "report").label).toBe("PDF")
})

test("the extension rescues generic octet-stream uploads", () => {
  expect(fileKind("application/octet-stream", "main.ts").label).toBe("TS")
  expect(fileKind("application/octet-stream", "app.tsx").label).toBe("TSX")
  expect(fileKind("", "script.py").label).toBe("Python")
  expect(fileKind("application/octet-stream", "notes.md").label).toBe(
    "Markdown"
  )
  expect(fileKind("application/octet-stream", "backup.tar.gz").label).toBe(
    "Archive"
  )
  expect(fileKind("application/octet-stream", "photo.HEIC")).toMatchObject({
    category: "image",
    label: "Image",
  })
  expect(fileKind("application/octet-stream", "schema.sql")).toMatchObject({
    icon: Database,
    label: "SQL",
  })
  expect(fileKind("application/octet-stream", "site.woff2").label).toBe("Font")
})

test("the extension refines plain text and unknown mime types", () => {
  expect(fileKind("text/plain", "query.sql").label).toBe("SQL")
  expect(fileKind("text/plain", "main.go").label).toBe("Go")
  expect(fileKind("text/plain", "server.rs").label).toBe("Rust")
  expect(fileKind("text/plain", "index.html").label).toBe("HTML")
  expect(fileKind("application/x-madeup", "rows.csv").label).toBe("CSV")
})

test("code files resolve per language by extension", () => {
  const cases: [string, string][] = [
    ["main.c", "C"],
    ["main.cpp", "C++"],
    ["app.cs", "C#"],
    ["style.css", "CSS"],
    ["run.java", "Java"],
    ["index.js", "JS"],
    ["app.kt", "Kotlin"],
    ["api.php", "PHP"],
    ["task.rb", "Ruby"],
    ["deploy.sh", "Shell"],
    ["view.swift", "Swift"],
  ]

  for (const [name, label] of cases) {
    expect(fileKind("application/octet-stream", name).label).toBe(label)
  }
})

test("plain and unknown files keep sane fallbacks", () => {
  expect(fileKind("text/plain", "notes.txt")).toMatchObject({
    category: "text",
    label: "Text",
  })
  expect(fileKind("text/plain", "README").label).toBe("Text")
  expect(fileKind("text/x-anything", "notes").label).toBe("Text")
  expect(fileKind("application/octet-stream", "blob")).toMatchObject({
    category: "binary",
    label: "File",
  })
  expect(fileKind("application/octet-stream", "widget.xyz").label).toBe("File")
  expect(fileKind("application/x-madeup", "widget").label).toBe("File")
})

test("a specific mime type wins over a misleading extension", () => {
  expect(fileKind("application/pdf", "report.bin").label).toBe("PDF")
  expect(fileKind("image/png", "photo.txt").label).toBe("Image")
})
