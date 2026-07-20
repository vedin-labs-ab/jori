import { type GenericCtx } from "@convex-dev/better-auth"
import { type DataModel } from "../convex/_generated/dataModel"
import { createAuth } from "../convex/auth"

/** Static instance for Better Auth schema generation only — never deployed.
 *  Regenerate convex/betterauth/schema.ts after changing auth plugins; the
 *  options read deployment env, so prime placeholders:
 *
 *    BETTER_AUTH_SECRET=generate MILO_APP_URL=http://localhost:5173 \
 *    GOOGLE_CLIENT_ID=generate GOOGLE_CLIENT_SECRET=generate \
 *    MICROSOFT_CLIENT_ID=generate MICROSOFT_CLIENT_SECRET=generate \
 *    npx auth generate --config scripts/betterauth.ts \
 *      --output convex/betterauth/schema.ts --yes
 */
export const auth = createAuth({} as GenericCtx<DataModel>)
