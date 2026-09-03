import { useQuery } from "convex/react"
import { useMemo } from "react"
import { api } from "../../../convex/_generated/api"

/** The organization's skill names, for `/` mentions in a job's brief;
 *  none while the catalog is still loading. */
export function useSkillNames(organizationId: string) {
  const skillList = useQuery(api.skills.catalog.list, { organizationId })

  return useMemo(
    () =>
      skillList !== undefined &&
      !Array.isArray(skillList) &&
      skillList.status === "ready"
        ? skillList.skills.map((skill) => skill.name)
        : [],
    [skillList]
  )
}
