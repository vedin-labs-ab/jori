import rateLimiter from "@convex-dev/rate-limiter/convex.config"
import resend from "@convex-dev/resend/convex.config"
import workflow from "@convex-dev/workflow/convex.config"
import { defineApp } from "convex/server"
import betterAuth from "./betterauth/convex.config"

const app = defineApp()
app.use(betterAuth)
app.use(resend)
app.use(rateLimiter)
app.use(workflow)

export default app
