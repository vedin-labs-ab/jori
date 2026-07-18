import { type AuthConfig } from "convex/server"
import { requireEnvironmentVariable } from "./shared/environment"

export default {
  providers: [
    {
      domain: requireEnvironmentVariable("CLERK_JWT_ISSUER_DOMAIN"),
      applicationID: "convex",
    },
  ],
} satisfies AuthConfig
