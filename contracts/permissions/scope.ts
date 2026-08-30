/**
 * Audience of a run: personal runs are visible to their creator only;
 * organization runs to every member. Materials and automations carry the
 * richer grant-based Visibility instead (see ./visibility); runs keep this
 * binary projection of their execution audience. Execution identity is
 * orthogonal and represented by an execution principal.
 */
export type Scope = "personal" | "organization"

export const scopeLabels: Record<Scope, string> = {
  personal: "Personal",
  organization: "Organization",
}
