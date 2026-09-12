import { createMiddleware } from "@tanstack/react-start"
import { regionConfig } from "./config"
import { handleRegionRequest, regionPinHeader } from "./routing"

export const regionRequestMiddleware = createMiddleware().server(
  async ({ next, request }) => {
    const response = handleRegionRequest(request, regionConfig)

    if (response !== null) {
      return response
    }

    const pin = regionPinHeader(request, regionConfig)
    const result = await next()

    if (pin !== undefined) {
      result.response.headers.append("Set-Cookie", pin)
    }

    return result
  }
)
