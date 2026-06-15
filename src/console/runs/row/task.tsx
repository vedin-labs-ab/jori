import { ClipboardList } from "lucide-react"
import { type ExecutionTaskSource } from "../types"
import {
  CodeBlockDetail,
  codeBlockContentClassName,
  DetailLink,
} from "./details"

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
