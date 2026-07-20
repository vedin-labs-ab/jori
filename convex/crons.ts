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

// Hourly heartbeat for billing cycles: accounts whose anchor is due get their
// included usage refreshed and their auto-top-up month reset. Grants are
// cron-driven so annual plans still refresh monthly and a missed Stripe
// webhook cannot skip a cycle.
crons.interval(
  "billing cycle sweep",
  { hours: 1 },
  internal.billing.cycle.sweep,
  {}
)

// Hourly heartbeat for deduction: each organization's activity window is clustered
// into efforts, then each belief kind reviews the changed efforts, with a
// weekly consolidation pass restructuring the roster. Quiet windows complete
// without a judge call, so frequency only costs when there is activity.
crons.interval(
  "deduction pass sweep",
  { hours: 1 },
  internal.deduction.engine.pass.sweep,
  {}
)

export default crons
