import fs from "node:fs"
import { createRequire } from "node:module"
import * as baseUi from "@base-ui/react"
import { Server } from "@modelcontextprotocol/sdk/server/index.js"
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"
import * as dismissableLayer from "@radix-ui/react-dismissable-layer"
import tailwindcss from "@tailwindcss/vite"
import * as cva from "class-variance-authority"
import * as clsx from "clsx"
import * as cmdk from "cmdk"
import * as carousel from "embla-carousel-react"
import * as inputOtp from "input-otp"
import * as lucide from "lucide-react"
import * as themes from "next-themes"
import * as radix from "radix-ui"
import * as react from "react"
import * as dayPicker from "react-day-picker"
import * as reactDom from "react-dom/client"
import * as panels from "react-resizable-panels"
import * as recharts from "recharts"
import * as sonner from "sonner"
import * as tailwindMerge from "tailwind-merge"
import * as vaul from "vaul"
import * as vite from "vite"
import * as zod from "zod"

const require = createRequire(import.meta.url)

void [
  Server,
  StdioServerTransport,
  baseUi,
  clsx,
  cva,
  dismissableLayer,
  cmdk,
  carousel,
  inputOtp,
  lucide,
  radix,
  react,
  reactDom,
  dayPicker,
  panels,
  recharts,
  sonner,
  tailwindcss,
  tailwindMerge,
  themes,
  vaul,
  vite,
  zod,
]
void [
  require.resolve("@fontsource-variable/geist"),
  require.resolve("shadcn"),
  require.resolve("tailwindcss"),
]

assertWorkspacePackage("tw-animate-css")

function assertWorkspacePackage(name: string) {
  const packageJson = new URL(
    `./node_modules/${name}/package.json`,
    import.meta.url
  )

  if (!fs.statSync(packageJson).isFile()) {
    throw new Error(`Missing package: ${name}`)
  }
}
