import { writeFile } from "node:fs/promises"
import path from "node:path"
import { readSkills } from "./read.ts"

const root = process.cwd()
const skills = await readSkills(path.join(root, "skills"))

await writeFile(
  path.join(root, "skills", "generated.ts"),
  [
    "export const skills = ",
    JSON.stringify(skills, null, 2),
    " as const\n",
  ].join("")
)
