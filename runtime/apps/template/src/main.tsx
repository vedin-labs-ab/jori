import { type ComponentType, StrictMode } from "react"
import { createRoot } from "react-dom/client"
import * as AppModule from "./App"
import "./jori.css"
import "./styles.css"

type AppExports = {
  default?: ComponentType
  App?: ComponentType
}

const App = (AppModule as AppExports).default ?? (AppModule as AppExports).App
const root = document.getElementById("root")

if (App === undefined) {
  throw new Error(
    "App source must export a default React component or named App component."
  )
}

if (root === null) {
  throw new Error("App root element is missing.")
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
)
