import { jobAudience } from "../fixtures/types"
import { type DemoAction, type DemoState } from "./types"

export function reduceAccess(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case "setVisibility":
      return setVisibility(state, action)
    case "mintShare":
      return {
        ...state,
        shares: {
          ...state.shares,
          [action.materialId]: [
            action.share,
            ...(state.shares[action.materialId] ?? []),
          ],
        },
      }
    case "revokeShare":
      return {
        ...state,
        shares: {
          ...state.shares,
          [action.materialId]: (state.shares[action.materialId] ?? []).filter(
            (share) => share.shareId !== action.shareId
          ),
        },
      }
    default:
      return state
  }
}

function setVisibility(
  state: DemoState,
  action: Extract<DemoAction, { type: "setVisibility" }>
): DemoState {
  const { target, visibility, at } = action

  if (target.kind === "folder") {
    return {
      ...state,
      folders: state.folders.map((folder) =>
        folder.folderId === target.id
          ? { ...folder, visibility, updatedAt: at }
          : folder
      ),
    }
  }

  if (target.kind === "job") {
    return {
      ...state,
      jobs: state.jobs.map((job) =>
        job.id === target.id
          ? {
              ...job,
              visibility,
              // A private job runs as its person; every shared mode runs
              // as the organization, which is what the list filters by.
              audience: jobAudience(visibility),
              updatedAt: at,
            }
          : job
      ),
    }
  }

  return {
    ...state,
    materials: state.materials.map((material) =>
      material.id === target.id
        ? { ...material, visibility, updatedAt: at }
        : material
    ),
  }
}
