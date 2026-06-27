import { Badge } from "@/components/ui/badge"
import { type ContextFacts, isFactPresent } from "./types"

export function FactsBody({ facts }: { facts: ContextFacts }) {
  return (
    <div className="grid gap-5">
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
    <div className="grid max-w-3xl gap-2">
      {hasName ? (
        <h2 className="font-heading text-lg font-medium text-foreground">
          {facts.name}
        </h2>
      ) : null}
      {hasSummary ? (
        <p className="max-w-[72ch] text-muted-foreground text-sm/relaxed">
          {facts.summary}
        </p>
      ) : null}
    </div>
  )
}

function ProductList({ products }: { products: ContextFacts["products"] }) {
  if (products.length === 0) {
    return null
  }

  return (
    <section className="grid max-w-3xl gap-2.5">
      <SectionLabel>
        {products.length === 1 ? "Product" : "Products"}
      </SectionLabel>
      <ul className="grid gap-3">
        {products.map((product) => (
          <li key={product.name} className="grid gap-0.5">
            <h3 className="font-heading text-sm font-medium text-foreground">
              {product.name}
            </h3>
            {isFactPresent(product.description) ? (
              <p className="text-muted-foreground text-xs/relaxed">
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
      <div className="flex flex-wrap gap-1.5">
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
    <span className="font-medium text-muted-foreground text-xs">
      {children}
    </span>
  )
}
