import { cn } from "@/lib/utils"

/** Token palette for every highlighted code surface; apply to a parent of
 *  the emitted `hljs-*` spans so all surfaces stay visually identical. */
export const codeTokenClassName = cn(
  "[&_.hljs-attr]:text-blue-600 dark:[&_.hljs-attr]:text-blue-400 [&_.hljs-string]:text-emerald-700 dark:[&_.hljs-string]:text-emerald-400",
  "[&_.hljs-literal]:text-violet-600 dark:[&_.hljs-literal]:text-violet-400 [&_.hljs-number]:text-amber-700 dark:[&_.hljs-number]:text-amber-400"
)
