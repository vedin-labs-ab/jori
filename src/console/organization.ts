import { createContext, useContext } from "react"

/** The organization a console frame resolved. Set by ConsolePage once it
 *  has one, so anything below can read it without threading a prop, and so
 *  a page nested in a section frame can tell it is already inside one. */
export const OrganizationContext = createContext<string | undefined>(undefined)

export function useOrganizationId() {
  return useContext(OrganizationContext)
}
