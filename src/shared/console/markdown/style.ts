import { codeTokenClassName } from "../tokens"

/** The one prose scale for rendered markdown, applied to the element the
 *  blocks sit in: the job editor's content, a brief laid out read-only,
 *  and Jori's messages in a chat all read at the same rhythm, so a reply
 *  and the brief that asked for it look like one product. */
export const markdownProseClassName = [
  "[&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
  "[&_p]:my-1 [&_p]:min-h-6 [&_p]:max-w-full [&_p]:break-words [&_p]:leading-6 [&_p]:[overflow-wrap:anywhere]",
  "[&_h1]:mt-3 [&_h1]:mb-1 [&_h1]:font-semibold [&_h1]:text-base [&_h1]:leading-6",
  "[&_h2]:mt-3 [&_h2]:mb-1 [&_h2]:font-semibold [&_h2]:text-sm [&_h2]:leading-6",
  "[&_h3]:mt-2 [&_h3]:mb-1 [&_h3]:font-semibold [&_h3]:text-xs [&_h3]:leading-6",
  "[&_h4]:mt-2 [&_h4]:font-medium [&_h5]:mt-2 [&_h5]:font-medium [&_h6]:mt-2 [&_h6]:font-medium",
  "[&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:pl-0.5",
  "[&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-3 [&_blockquote]:text-muted-foreground",
  "[&_hr]:my-3 [&_hr]:border-border",
  "[&_a]:text-foreground [&_a]:underline [&_a]:decoration-muted-foreground/50 [&_a]:underline-offset-2",
  "[&_code]:rounded-sm [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.9em]",
  "[&_pre]:my-2 [&_pre]:max-w-full [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:border [&_pre]:bg-muted/40 [&_pre]:px-3 [&_pre]:py-2 [&_pre]:whitespace-pre",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-xs",
  "[&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_table]:text-xs [&_th]:border-b [&_th]:px-2 [&_th]:py-1 [&_th]:text-left [&_th]:font-medium [&_td]:border-b [&_td]:border-border/60 [&_td]:px-2 [&_td]:py-1 [&_td]:align-top",
  codeTokenClassName,
].join(" ")
