import { defineComponent } from "convex/server"

/** Local install of the Better Auth component (name must stay `betterAuth`
 *  to match `components.betterAuth`): the schema lives in this directory so
 *  it can carry the organization plugin's tables. */
const component = defineComponent("betterAuth")

export default component
