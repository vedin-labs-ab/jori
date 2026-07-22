import { createMiddleware } from "@tanstack/react-start"
import { regionConfig } from "./config"
import { handleRegionRequest } from "./routing"

export const regionRequestMiddleware = createMiddleware().server(
  ({ next, request }) => {
    const response = handleRegionRequest(request, regionConfig)

    return response ?? next()
  }
)
