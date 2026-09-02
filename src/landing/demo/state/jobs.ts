import { type DemoAction, type DemoState } from "./types"

export function reduceJobs(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case "setJobPaused":
      return {
        ...state,
        jobs: state.jobs.map((job) =>
          job.id === action.jobId
            ? {
                ...job,
                status: action.paused ? "paused" : "active",
                updatedAt: action.at,
              }
            : job
        ),
      }
    case "deleteJob":
      return {
        ...state,
        jobs: state.jobs.filter((job) => job.id !== action.jobId),
      }
    case "createJob":
      return { ...state, jobs: [...state.jobs, action.job] }
    case "updateJob":
      return {
        ...state,
        jobs: state.jobs.map((job) =>
          job.id === action.job.id ? action.job : job
        ),
      }
    default:
      return state
  }
}
