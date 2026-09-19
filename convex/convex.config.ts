import r2 from "@convex-dev/r2/convex.config"
import rateLimiter from "@convex-dev/rate-limiter/convex.config"
import workflow from "@convex-dev/workflow/convex.config"
import { defineApp } from "convex/server"
import betterAuth from "./betterauth/convex.config"

const app = defineApp()
app.use(betterAuth)
app.use(r2)
app.use(rateLimiter)
app.use(workflow)

export default app
