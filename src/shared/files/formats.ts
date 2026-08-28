import {
  Database,
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileJson,
  FileSpreadsheet,
  FileText,
  FileType,
  FileVideo,
  type LucideIcon,
  Presentation,
  SquareTerminal,
  Table,
} from "lucide-react"

export type FileCategory =
  | "archive"
  | "audio"
  | "binary"
  | "code"
  | "data"
  | "document"
  | "font"
  | "image"
  | "text"
  | "video"

/** How a stored file presents: a short human label, a monochrome Lucide
 *  icon, and a coarse category. */
export type FileKind = {
  category: FileCategory
  icon: LucideIcon
  label: string
}

function code(label: string, icon: LucideIcon = FileCode): FileKind {
  return { category: "code", icon, label }
}

function data(label: string, icon: LucideIcon): FileKind {
  return { category: "data", icon, label }
}

/** Every kind the registry can name. Media get generic labels; code and
 *  structured text get per-format ones, where the format is what matters. */
export const kinds = {
  archive: { category: "archive", icon: FileArchive, label: "Archive" },
  audio: { category: "audio", icon: FileAudio, label: "Audio" },
  binary: { category: "binary", icon: File, label: "File" },
  c: code("C"),
  cpp: code("C++"),
  csharp: code("C#"),
  css: code("CSS"),
  csv: data("CSV", Table),
  excel: { category: "document", icon: FileSpreadsheet, label: "Excel" },
  font: { category: "font", icon: FileType, label: "Font" },
  go: code("Go"),
  html: code("HTML"),
  image: { category: "image", icon: FileImage, label: "Image" },
  java: code("Java"),
  javascript: code("JS"),
  json: data("JSON", FileJson),
  jsx: code("JSX"),
  kotlin: code("Kotlin"),
  markdown: data("Markdown", FileText),
  pdf: { category: "document", icon: FileText, label: "PDF" },
  php: code("PHP"),
  powerpoint: { category: "document", icon: Presentation, label: "PowerPoint" },
  python: code("Python"),
  ruby: code("Ruby"),
  rust: code("Rust"),
  shell: code("Shell", SquareTerminal),
  sql: code("SQL", Database),
  svg: { category: "image", icon: FileImage, label: "SVG" },
  swift: code("Swift"),
  text: { category: "text", icon: FileText, label: "Text" },
  toml: data("TOML", FileCode),
  tsv: data("TSV", Table),
  tsx: code("TSX"),
  typescript: code("TS"),
  video: { category: "video", icon: FileVideo, label: "Video" },
  word: { category: "document", icon: FileText, label: "Word" },
  xml: data("XML", FileCode),
  yaml: data("YAML", FileCode),
} satisfies Record<string, FileKind>

/** Kinds keyed by the leading `type/` of a mime type, for families where
 *  the family alone decides the presentation. */
export const prefixKinds = new Map<string, FileKind>([
  ["audio", kinds.audio],
  ["font", kinds.font],
  ["image", kinds.image],
  ["text", kinds.text],
  ["video", kinds.video],
])

const mimeGroups: [FileKind, string[]][] = [
  [
    kinds.archive,
    [
      "application/gzip",
      "application/vnd.rar",
      "application/x-7z-compressed",
      "application/x-bzip2",
      "application/x-gzip",
      "application/x-rar-compressed",
      "application/x-tar",
      "application/x-xz",
      "application/x-zip-compressed",
      "application/zip",
    ],
  ],
  [kinds.css, ["text/css"]],
  [kinds.csv, ["application/csv", "text/csv"]],
  [
    kinds.excel,
    [
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ],
  ],
  [
    kinds.font,
    [
      "application/font-woff",
      "application/font-woff2",
      "application/vnd.ms-fontobject",
      "application/x-font-otf",
      "application/x-font-ttf",
    ],
  ],
  [kinds.html, ["text/html"]],
  [
    kinds.javascript,
    ["application/javascript", "application/x-javascript", "text/javascript"],
  ],
  [kinds.json, ["application/json"]],
  [kinds.markdown, ["text/markdown", "text/x-markdown"]],
  [kinds.pdf, ["application/pdf"]],
  [kinds.php, ["application/x-httpd-php"]],
  [
    kinds.powerpoint,
    [
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ],
  ],
  [kinds.python, ["text/x-python"]],
  [kinds.shell, ["application/x-sh", "application/x-shellscript"]],
  [kinds.sql, ["application/sql"]],
  [kinds.svg, ["image/svg+xml"]],
  [kinds.toml, ["application/toml", "text/toml"]],
  [kinds.tsv, ["text/tab-separated-values"]],
  [kinds.typescript, ["application/typescript", "text/typescript"]],
  [
    kinds.word,
    [
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ],
  ],
  [kinds.xml, ["application/xml", "text/xml"]],
  [kinds.yaml, ["application/x-yaml", "application/yaml", "text/x-yaml"]],
]

const extensionGroups: [FileKind, string[]][] = [
  [kinds.archive, ["7z", "bz2", "gz", "rar", "tar", "tgz", "xz", "zip"]],
  [kinds.audio, ["aac", "flac", "m4a", "mp3", "ogg", "wav"]],
  [kinds.c, ["c", "h"]],
  [kinds.cpp, ["cc", "cpp", "cxx", "hpp"]],
  [kinds.csharp, ["cs"]],
  [kinds.css, ["css", "less", "scss"]],
  [kinds.csv, ["csv"]],
  [kinds.excel, ["xls", "xlsx"]],
  [kinds.font, ["eot", "otf", "ttf", "woff", "woff2"]],
  [kinds.go, ["go"]],
  [kinds.html, ["htm", "html"]],
  [
    kinds.image,
    [
      "avif",
      "bmp",
      "gif",
      "heic",
      "heif",
      "ico",
      "jpeg",
      "jpg",
      "png",
      "tif",
      "tiff",
      "webp",
    ],
  ],
  [kinds.java, ["java"]],
  [kinds.javascript, ["cjs", "js", "mjs"]],
  [kinds.json, ["json", "jsonl"]],
  [kinds.jsx, ["jsx"]],
  [kinds.kotlin, ["kt", "kts"]],
  [kinds.markdown, ["markdown", "md"]],
  [kinds.pdf, ["pdf"]],
  [kinds.php, ["php"]],
  [kinds.powerpoint, ["ppt", "pptx"]],
  [kinds.python, ["py"]],
  [kinds.ruby, ["rb"]],
  [kinds.rust, ["rs"]],
  [kinds.shell, ["bash", "sh", "zsh"]],
  [kinds.sql, ["sql"]],
  [kinds.svg, ["svg"]],
  [kinds.swift, ["swift"]],
  [kinds.text, ["log", "text", "txt"]],
  [kinds.toml, ["toml"]],
  [kinds.tsv, ["tsv"]],
  [kinds.tsx, ["tsx"]],
  [kinds.typescript, ["cts", "mts", "ts"]],
  [kinds.video, ["avi", "m4v", "mkv", "mov", "mp4", "webm"]],
  [kinds.word, ["doc", "docx"]],
  [kinds.yaml, ["yaml", "yml"]],
]

export const mimeKinds = toLookup(mimeGroups)
export const extensionKinds = toLookup(extensionGroups)

function toLookup(groups: [FileKind, string[]][]) {
  return new Map(
    groups.flatMap(([kind, keys]) => keys.map((key) => [key, kind] as const))
  )
}
