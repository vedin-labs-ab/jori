import { integrations } from "@contracts/integrations"
import {
  type MentionResource,
  type MentionSources,
} from "@/shared/console/mentions/sources"
import { demoPermissions, demoSkills } from "../fixtures/permissions"
import { type DemoState } from "../state/types"

/** What a chat over the workspace can mention: every integration,
 *  Copperline's skills and allowed tools, and everything in the
 *  workspace by name — its chats, materials, jobs, folders, and runs. */
export function mentionSources(state: DemoState): MentionSources {
  return {
    integrations,
    resources: workspaceResources(state),
    skills: demoSkills,
    tools: demoPermissions
      .filter((permission) => permission.mode !== "blocked")
      .map((permission) => ({
        label: permission.label,
        surface: permission.surface,
        tool: permission.tool,
      })),
  }
}

function workspaceResources(state: DemoState): MentionResource[] {
  return [
    ...state.chat.conversations.map((conversation) => ({
      kind: "chat" as const,
      id: conversation.id,
      name: conversation.title,
    })),
    ...state.materials.map((material) => ({
      kind: material.kind,
      id: material.id,
      name: material.name,
    })),
    ...state.jobs.map((job) => ({
      kind: "job" as const,
      id: job.id,
      name: job.name,
    })),
    ...state.folders.map((folder) => ({
      kind: "folder" as const,
      id: folder.folderId,
      name: folder.name,
    })),
    ...state.runs.map((run) => ({
      kind: "run" as const,
      id: run.id,
      name: run.title,
    })),
  ]
}
