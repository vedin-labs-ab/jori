import { type Region } from "@contracts/region"

export const regionOptions = [
  { flag: "🇺🇸", id: "us", label: "US" },
  { flag: "🇪🇺", id: "eu", label: "EU" },
] as const satisfies readonly {
  flag: string
  id: Region
  label: string
}[]
