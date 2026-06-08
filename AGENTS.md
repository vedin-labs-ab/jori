# Guidelines

## Development Guidelines

- Ensure `pnpm run check` passes before handoff.
- Use Biome only for linting and formatting.
- If you've changed Convex code, run `pnpm run deploy` before handoff.
- Do not weaken or bypass checks to make them pass unless explicitly instructed.

### Code Quality & Architecture

- Prefer simplicity over cleverness. If the same outcome can be achieved with less code, choose the simpler approach.
- Aggressively avoid duplication. Extract reusable code into clear, well-defined functions or modules.
- Prioritize readability above all. The codebase should be easy to scan and understand at a glance.
- Use descriptive, explicit naming. Avoid single-letter variables and unclear abbreviations.
- Improve the code you touch: remove local duplication, clarify names, simplify control flow, and leave nearby structure easier to understand.

### System Design Principles

- Organize by domain and responsibility: colocate related UI, logic, data access, schemas, and tests under the feature or domain they serve.
- Use folder and file structure to communicate intent, ownership, boundaries, and layering.
- Prefer single-word folder and file names. If a name needs multiple words, introduce another folder layer so each level has one clear responsibility.
- Prefer names and nesting that make the system understandable from the filesystem before reading implementation details.

### Change Philosophy

The platform is currently pre-launch, so prioritize clean, complete changes over compatibility with unfinished implementations.

- Treat the system as if it has no legacy constraints.
- Avoid phased migrations, fallbacks, and backward compatibility layers.
- Prefer clean, decisive changes over incremental patching.
- Do not introduce temporary solutions that become permanent bloat.

Complexity compounds quickly. Be deliberate in preventing it.

## Design Guidelines

- Always use shadcn/ui primitives when available.
- Install shadcn/ui components with the official `npx shadcn@latest add` command. Never recreate shadcn/ui components from memory.
- Keep shadcn/ui default styling.
- Keep product design simple and consistent.
- Style elements using Tailwind via `className` only.
- Do not modify `index.css` unless clearly necessary.
- Desktop-optimized, fully responsive and adaptive.
- Never use gradients.

## Convex

This project uses Convex as its backend.

When working on Convex code, **always read `convex/_generated/ai/GUIDELINES.md` first**.  
This file defines the correct usage patterns and overrides any prior assumptions.
