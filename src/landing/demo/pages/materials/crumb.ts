import { type ReactNode, useMemo } from "react"
import {
  type MaterialBreadcrumb,
  useMaterialTrail,
} from "@/shared/console/materials/breadcrumb"
import { folderOf, folderTrail } from "../../derive/folders"
import { type DemoMaterial } from "../../fixtures/types"
import { type DemoState } from "../../state/types"
import { useDemoWorkspace } from "../../workspace"

/** Publishes the material's crumb with the menu hung off its name. */
export function useMaterialCrumb(material: DemoMaterial, menu: ReactNode) {
  const { state } = useDemoWorkspace()

  useMaterialTrail(
    useMemo(
      () => ({ ...materialCrumb(state, material), menu }),
      [material, menu, state]
    )
  )
}

/** The material's crumb: its folder's own trail when it is filed, so the
 *  page says where the material lives, and the surface's otherwise. */
export function materialCrumb(
  state: DemoState,
  material: DemoMaterial
): MaterialBreadcrumb {
  const folder =
    material.folderId === undefined
      ? undefined
      : folderOf(state, material.folderId)

  return {
    name: material.name,
    ...(folder === undefined
      ? {}
      : {
          trail: folderTrail(state, folder).map((segment) => ({
            name: segment.name,
            params: { folderId: segment.folderId },
            to: "/folders/$folderId",
          })),
        }),
  }
}
