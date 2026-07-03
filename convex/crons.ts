import { cronJobs } from "convex/server"
import { internal } from "./_generated/api"

const crons = cronJobs()

// Daily heartbeat for organization-context freshness. The sweep only checks
// sources whose `checkAt` is due; unchanged pages are nudged a day, processed
// pages relax two weeks.
crons.interval(
  "organization source sweep",
  { hours: 24 },
  internal.organization.watch.sweep,
  {}
)

// Daily heartbeat for deduction: reviews each tenant's activity window and
// updates the belief roster, one pass per kind.
crons.interval(
  "deduction pass sweep",
  { hours: 24 },
  internal.deduction.pass.sweep,
  {}
)

export default crons
