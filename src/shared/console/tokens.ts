import { cn } from "@/lib/utils"

/** Token palette for every highlighted code surface; apply to a parent of
 *  the emitted `hljs-*` spans so all surfaces stay visually identical.
 *  JSON needs the first four; source code in a reply adds keywords,
 *  comments, names, and types on the same four hues. */
export const codeTokenClassName = cn(
  "[&_.hljs-attr]:text-blue-600 dark:[&_.hljs-attr]:text-blue-400 [&_.hljs-string]:text-emerald-700 dark:[&_.hljs-string]:text-emerald-400",
  "[&_.hljs-literal]:text-violet-600 dark:[&_.hljs-literal]:text-violet-400 [&_.hljs-number]:text-amber-700 dark:[&_.hljs-number]:text-amber-400",
  "[&_.hljs-keyword]:text-violet-600 dark:[&_.hljs-keyword]:text-violet-400 [&_.hljs-comment]:text-muted-foreground [&_.hljs-comment]:italic",
  "[&_.hljs-title]:text-blue-600 dark:[&_.hljs-title]:text-blue-400 [&_.hljs-name]:text-blue-600 dark:[&_.hljs-name]:text-blue-400 [&_.hljs-built_in]:text-blue-600 dark:[&_.hljs-built_in]:text-blue-400",
  "[&_.hljs-type]:text-amber-700 dark:[&_.hljs-type]:text-amber-400 [&_.hljs-meta]:text-muted-foreground [&_.hljs-section]:font-medium"
)
