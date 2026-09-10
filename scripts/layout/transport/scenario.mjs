export const app = (id, title, path, steps) => ({
  id,
  title,
  path,
  target: "app",
  mutating: false,
  ...(steps ? { steps } : {}),
})
export const click = (selector) => ({ action: "click", selector })
export const retry = 'button:text-is("Try again")'
export const reload = 'button:text-is("Reload")'
export const noOrganization = [
  {
    url: "http://localhost:5178/api/auth/organization/get-full-organization*",
    status: 200,
    body: "null",
    persistent: true,
  },
  {
    url: "http://localhost:5178/api/auth/organization/list",
    status: 200,
    body: "[]",
    persistent: true,
  },
]
export const missingChunk = (name) => ({
  url: `http://localhost:5178/assets/${name}-*.js`,
  status: 404,
  body: "{}",
  persistent: true,
})
