import { type DemoAction, type DemoState } from "./types"

export function reduceMaterials(
  state: DemoState,
  action: DemoAction
): DemoState {
  switch (action.type) {
    case "createMaterial":
      return { ...state, materials: [...state.materials, action.material] }
    case "updateMaterial":
      return {
        ...state,
        materials: state.materials.map((material) =>
          material.id === action.id
            ? {
                ...material,
                name: action.name,
                description: action.description,
                updatedAt: action.at,
              }
            : material
        ),
      }
    case "removeMaterial": {
      const { [action.id]: _removed, ...shares } = state.shares

      return {
        ...state,
        materials: state.materials.filter(
          (material) => material.id !== action.id
        ),
        shares,
      }
    }
    default:
      return state
  }
}
