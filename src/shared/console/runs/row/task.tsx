import { ClipboardList } from "lucide-react"
import { cn } from "@/lib/utils"
import { scrollFade } from "@/shared/fade"
import {
  CodeBlockDetail,
  codeBlockContentClassName,
  DetailLink,
} from "../details"

export function TaskDetail({
  sourceUrl,
  task,
}: {
  sourceUrl?: string
  task: string
}) {
  if (sourceUrl !== undefined) {
    return (
      <CodeBlockDetail
        header={<DetailLink href={sourceUrl}>Source</DetailLink>}
        icon={ClipboardList}
        label="Task"
        value={task}
      />
    )
  }

  return (
    <CodeBlockDetail
      contentClassName={cn(scrollFade, codeBlockContentClassName)}
      icon={ClipboardList}
      label="Task"
      value={task}
    />
  )
}
