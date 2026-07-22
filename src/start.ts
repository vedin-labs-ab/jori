import { createCsrfMiddleware, createStart } from "@tanstack/react-start"
import { regionRequestMiddleware } from "@/shared/region/middleware"

const csrfMiddleware = createCsrfMiddleware({
  filter: (context) => context.handlerType === "serverFn",
})

export const startInstance = createStart(() => ({
  requestMiddleware: [regionRequestMiddleware, csrfMiddleware],
}))
