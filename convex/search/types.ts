import { type Region } from "../../contracts/region"

export type SearchInput = {
  query: string
  limit: number
  maxCharacters: number
  includeDomains?: string[]
  excludeDomains?: string[]
}

export type PageInput = {
  url: string
  maxCharacters: number
  highlightQuery?: string
  refresh?: boolean
  maxLinks?: number
}

export type SearchResult = {
  url: string
  id?: string
  title?: string
  author?: string
  faviconUrl?: string
  imageUrl?: string
  publishedAt?: string
  score?: number
  text?: string
  highlights: string[]
  links: string[]
}

export type SearchResponse = {
  provider: {
    name: string
    requestId?: string
    resolvedSearchType?: string
    searchTimeMs?: number
    statuses?: Array<{ id: string; source: string; status: string }>
  }
  results: SearchResult[]
}

export type SearchClient = {
  region: Region
  processing: "global" | Region
  search(input: SearchInput): Promise<SearchResponse>
  fetch(input: PageInput): Promise<SearchResponse>
}
