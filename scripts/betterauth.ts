import { type GenericCtx } from "@convex-dev/better-auth"
import { type DataModel } from "../convex/_generated/dataModel"
import { createAuth } from "../convex/auth"

/** Static instance for Better Auth schema generation only — never deployed.
 *  Regenerate convex/betterauth/generated.ts after changing auth plugins. It
 *  is the CLI's output and is overwritten whole, so custom indexes live in
 *  convex/betterauth/schema.ts, which imports its tables. The options read
 *  deployment env, so prime placeholders, and run from the output's own
 *  directory: the CLI resolves --output and writes the result into the file
 *  header, so running from the project root commits an absolute path.
 *
 *    cd convex/betterauth
 *    BETTER_AUTH_SECRET=$(openssl rand -base64 32) \
 *    JORI_APP_URL=http://localhost:8050 \
 *    GOOGLE_CLIENT_ID=generate GOOGLE_CLIENT_SECRET=generate \
 *    MICROSOFT_CLIENT_ID=generate MICROSOFT_CLIENT_SECRET=generate \
 *    npx auth generate --config ../../scripts/betterauth.ts \
 *      --output generated.ts --yes
 *
 *  Then `pnpm check:fix`, since the CLI emits its own formatting.
 */
export const auth = createAuth({} as GenericCtx<DataModel>)
