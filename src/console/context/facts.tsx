import { Badge } from "@/components/ui/badge"
import { type ContextFacts, isFactPresent } from "./types"

export function FactsBody({ facts }: { facts: ContextFacts }) {
  return (
    <div className="grid gap-7">
      <Identity facts={facts} />
      <ProductList products={facts.products} />
      <AliasList aliases={facts.aliases} />
    </div>
  )
}

function Identity({ facts }: { facts: ContextFacts }) {
  const hasName = isFactPresent(facts.name)
  const hasSummary = isFactPresent(facts.summary)

  if (!hasName && !hasSummary) {
    return null
  }

  return (
    <div className="grid max-w-3xl gap-3">
      {hasName ? (
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">
          {facts.name}
        </h2>
      ) : null}
      {hasSummary ? (
        <p className="text-base leading-7 text-foreground">{facts.summary}</p>
      ) : null}
    </div>
  )
}

function ProductList({ products }: { products: ContextFacts["products"] }) {
  if (products.length === 0) {
    return null
  }

  return (
    <section className="grid max-w-3xl gap-3">
      <SectionLabel>
        {products.length === 1 ? "Product" : "Products"}
      </SectionLabel>
      <ul className="grid gap-4">
        {products.map((product) => (
          <li key={product.name} className="grid gap-1">
            <h3 className="text-base font-semibold text-foreground">
              {product.name}
            </h3>
            {isFactPresent(product.description) ? (
              <p className="text-sm leading-6 text-muted-foreground">
                {product.description}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  )
}

function AliasList({ aliases }: { aliases: string[] }) {
  if (aliases.length === 0) {
    return null
  }

  return (
    <section className="grid gap-2">
      <SectionLabel>Also known as</SectionLabel>
      <div className="flex flex-wrap gap-2">
        {aliases.map((alias) => (
          <Badge key={alias} variant="secondary">
            {alias}
          </Badge>
        ))}
      </div>
    </section>
  )
}

function SectionLabel({ children }: { children: string }) {
  return (
    <span className="text-sm font-semibold text-muted-foreground">
      {children}
    </span>
  )
}
