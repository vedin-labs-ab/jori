---
name: frontend-design
description: Design Milo-native artifact and frontend UI. Use for creating, revising, simplifying, or evaluating layouts, flows, dashboards, tools, forms, empty states, and artifact experiences. Focuses on outcome-first product design, shadcn/ui primitives, restrained Milo styling, and distilled useful surfaces.
category: Milo
---

# Frontend Design

Design Milo-native product interfaces that help users get value quickly. The UI
should feel like part of Milo, not a standalone mini-site, demo, or decorative
artifact.

Use this skill for Milo artifact UI work, especially with `artifact-creator`.

## Design Goal

Start from the user outcome, not the component layout.

Before designing, identify:

- What is the user trying to understand, decide, or do?
- What information is required for that outcome?
- What actions are required, and which one is primary?
- What can be removed, hidden, combined, or delayed?
- What states must exist for the experience to be trustworthy?

A good artifact makes the useful thing obvious. It should not make the user
inspect a decorative interface to find the value.

## Milo Design Language

Milo UI is calm, capable, operational, and direct.

Prefer:

- Familiar product patterns over novelty.
- Clear hierarchy over visual drama.
- Dense but readable layouts when the task needs comparison or scanning.
- Standard controls over invented interactions.
- Restrained color for state, selection, and primary actions.
- Plain language over promotional copy.
- Predictable navigation, grouping, and actions.

Avoid:

- Marketing-style heroes.
- Decorative gradients.
- Glassmorphism.
- Overdesigned card grids.
- Fake metrics or generic dashboard filler.
- Repeated icon-heading-description blocks.
- Modals as the first solution.
- Decorative motion.
- Custom controls when shadcn/ui already has the primitive.

The interface should disappear into the task.

## Use Existing Components

Rely on Milo-provided shadcn/ui primitives and template styling.

Do not recreate common components from scratch when a primitive exists.
Buttons, inputs, selects, dialogs, tabs, tables, badges, cards, separators,
skeletons, alerts, menus, and tooltips should use the provided component
vocabulary.

Style with Tailwind `className` only. Keep styling close to the component and
aligned with the template tokens. Do not modify global CSS unless the artifact
explicitly requires a reusable local pattern.

Default to Milo-native component behavior and styling. Add custom visual
treatment only when it clarifies hierarchy, state, or workflow.

## Distill the Surface

Every design should pass through a simplification pass.

### Find the Essence

Name the one primary purpose of the surface. If there are several, order them
and make only the first one visually dominant.

Ask:

- What is the 20% of UI that delivers 80% of the value?
- What does the user need immediately?
- What can move behind progressive disclosure?
- What is redundant with other text, labels, controls, or sections?
- What can be combined into a single clearer element?

Simplicity does not mean removing necessary capability. It means removing
obstacles between the user and the outcome.

### Reduce Choices

Use one primary action per view or section. Secondary actions should be visibly
secondary. Tertiary actions belong in menus, details sections, or contextual
controls.

Do not show every possible action at once. Reveal advanced or destructive
actions only where they are relevant.

### Reduce Visual Noise

Prefer spacing, alignment, and typography over extra borders, shadows,
backgrounds, and containers.

Cards are useful for distinct repeated items or genuinely framed tools. They
are not the default page layout. Do not nest cards.

Remove decorative wrappers, repeated labels, redundant summaries, and
placeholder content that does not help the user act.

### Reduce Copy

Use short, specific interface copy.

Prefer concrete verbs:

- Review run.
- Approve request.
- Connect Slack.
- Retry sync.

Avoid explanatory filler, restated headings, and vague product language.

## Layout Guidance

Choose layout based on the artifact's job.

Use:

- Tables or lists for comparison, history, queues, logs, and repeated records.
- Forms for setup and configuration.
- Tabs for sibling views of the same object.
- Split panes when selection and detail need to stay connected.
- Timelines for ordered events.
- Empty states that explain the next useful action.
- Inline disclosure for details users only sometimes need.

Do not start with a dashboard unless the user needs a dashboard. Do not start
with a card grid unless the content is actually a set of peer items.

## Required States

Design the complete experience, not only the happy path.

Consider:

- Initial loading.
- Empty state.
- Normal populated state.
- Long content.
- Error or unavailable data.
- User-confirmed destructive action.
- Disabled or permission-limited actions.
- Success or completion feedback.

A Milo artifact should feel trustworthy when things are missing, slow, partial,
or failed.

## Interaction Guidance

Interactions should feel standard and reversible.

Use direct manipulation where possible. Prefer inline edits, contextual menus,
tabs, and explicit submit actions over custom flows.

Motion, when used, should communicate state: loading, reveal, selection,
completion. Do not add motion for decoration.

Keyboard access, visible focus, semantic labels, and readable contrast are part
of the design, not a final cleanup step.

## Final Check

Before handing off a design or implementation, verify:

- The primary outcome is obvious.
- The primary action is visually clear.
- The UI uses Milo/shadcn primitives wherever available.
- There are no decorative gradients or marketing patterns.
- The layout contains only sections that support the outcome.
- Copy is short, concrete, and non-redundant.
- Empty, loading, error, and success states are accounted for.
- The artifact feels like Milo, not a separate app.
