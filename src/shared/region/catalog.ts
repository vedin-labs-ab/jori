import { type Region } from "@contracts/region"

export const regionOptions = [
  { flag: "🇺🇸", id: "us", label: "United States" },
  { flag: "🇪🇺", id: "eu", label: "European Union" },
] as const satisfies readonly {
  flag: string
  id: Region
  label: string
}[]
