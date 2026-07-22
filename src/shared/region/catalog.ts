import { type Region } from "@contracts/region"

export const regionOptions = [
  { id: "us", label: "US" },
  { id: "eu", label: "EU" },
] as const satisfies readonly { id: Region; label: string }[]
