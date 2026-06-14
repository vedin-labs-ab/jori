import { ClipboardList } from "lucide-react"
import {
  CodeBlockDetail,
  codeBlockContentClassName,
  DetailLink,
} from "./details"
import { type ExecutionTaskSource } from "./types"

export function TaskDetail({
  source,
  task,
}: {
  source?: ExecutionTaskSource
  task: string
}) {
  if (source?.url !== undefined) {
    return (
      <CodeBlockDetail
        header={<DetailLink href={source.url}>{source.label}</DetailLink>}
        icon={ClipboardList}
        label="Task"
        value={task}
      />
    )
  }

  return (
    <CodeBlockDetail
      contentClassName={codeBlockContentClassName}
      icon={ClipboardList}
      label="Task"
      value={task}
    />
  )
}
