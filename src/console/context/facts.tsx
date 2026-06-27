import { Badge } from "@/components/ui/badge"
import { type ContextFacts, isFactPresent } from "./types"

export function FactsBody({ facts }: { facts: ContextFacts }) {
  return (
    <div className="grid gap-3 text-sm">
      <Field label="Name" value={facts.name} />
      <Field label="Summary" value={facts.summary} />
      <ProductList products={facts.products} />
      <ChipRow label="Aliases" items={facts.aliases} />
      <ChipRow label="Domains" items={facts.domains} />
    </div>
  )
}

function Field({ label, value }: { label: string; value: string | undefined }) {
  if (!isFactPresent(value)) {
    return null
  }

  return (
    <div className="grid gap-1">
      <FieldLabel>{label}</FieldLabel>
      <span className="text-foreground">{value}</span>
    </div>
  )
}

function ChipRow({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) {
    return null
  }

  return (
    <div className="grid gap-1.5">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => (
          <Badge key={item} variant="secondary">
            {item}
          </Badge>
        ))}
      </div>
    </div>
  )
}

function ProductList({ products }: { products: ContextFacts["products"] }) {
  if (products.length === 0) {
    return null
  }

  return (
    <div className="grid gap-1.5">
      <FieldLabel>Products</FieldLabel>
      <ul className="grid gap-1.5">
        {products.map((product) => (
          <li key={product.name} className="grid gap-0.5">
            <span className="font-medium text-foreground">{product.name}</span>
            {isFactPresent(product.description) ? (
              <span className="text-muted-foreground">
                {product.description}
              </span>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}

function FieldLabel({ children }: { children: string }) {
  return (
    <span className="text-xs font-medium text-muted-foreground">
      {children}
    </span>
  )
}
