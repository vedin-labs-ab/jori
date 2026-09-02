import { textSize } from "../fixtures/materials/files"
import { type DemoMaterial } from "../fixtures/types"
import { type DemoAction, type DemoState } from "./types"

/** Writes into a material's content: a store's value or schema, a text
 *  file's text. A value write bumps the version the way storage does. */
export function reduceWrites(state: DemoState, action: DemoAction): DemoState {
  switch (action.type) {
    case "writeStoreValue":
      return patchMaterial(state, action.storeId, (material) =>
        material.kind === "store"
          ? {
              ...material,
              value: action.value,
              version: material.version + 1,
              updatedAt: action.at,
            }
          : material
      )
    case "writeStoreSchema":
      return patchMaterial(state, action.storeId, (material) =>
        material.kind === "store"
          ? { ...material, schema: action.schema, updatedAt: action.at }
          : material
      )
    case "writeFileText":
      return patchMaterial(state, action.fileId, (material) =>
        material.kind === "file"
          ? {
              ...material,
              text: action.text,
              size: textSize(action.text),
              updatedAt: action.at,
            }
          : material
      )
    default:
      return state
  }
}

function patchMaterial(
  state: DemoState,
  id: string,
  patch: (material: DemoMaterial) => DemoMaterial
): DemoState {
  return {
    ...state,
    materials: state.materials.map((material) =>
      material.id === id ? patch(material) : material
    ),
  }
}
