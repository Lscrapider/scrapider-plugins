# Modular Plan and Implementation Briefs

The primary agent dispatches from `PLAN.md`. Give each module a stable Brief ID and a link to
`briefs/<brief-name>.md`. The module's implementer reads that Brief for all implementation steps.
Define shared contracts once and link to them from each consumer.

## Example layout

```text
.scrapider/plan/YYYY-MM-DD-<feature-name>/
├── PLAN.md
├── REVIEW.md
└── briefs/
    ├── order-import.md
    └── order-worker.md
```

With the order event format agreed, one implementer can build the importer that publishes the
event while another builds the worker that consumes it. Their end-to-end check needs both modules.

## Total `PLAN.md`

```markdown
---
mode: modular
---

# <Change name>

## Outcome and scope

<Full requested behavior, boundaries, constraints and source requirements. Account for all
required outcomes, including failure cases and existing behavior to preserve.>

## Shared contracts

<Agreed interfaces, data ownership and cross-module guarantees. Link existing definitions.
Identify any decision the user still needs to make and which work depends on it.>

## Module assignments

### B01

**Brief** [Order import](briefs/order-import.md)

- **Goal and write scope** <What the module delivers and which paths it owns. Identify symbols
  and ordering where modules share a file.>
- **Dependencies** <What can start immediately, which contract or upstream output is needed,
  and when it is needed.>
- **Completion criteria** <Observable behavior for the whole Brief, including what its consumers
  can rely on. Link applicable requirements.>

<Give each additional module its own ID, Brief and allocation.>

## Integration and acceptance

<Which outputs must work together, where they are consumed, and what combined check demonstrates
the requested behavior. Include any environment or activation prerequisite with the check it affects.>

[Review assignments](REVIEW.md)
```

## Module Brief

For the example above, write `briefs/order-import.md`. Use its ID from the total plan.

```markdown
# B01 Order import

**Assignment** [Scope, dependencies and completion criteria](../PLAN.md#b01)

## Inputs and implementation

<Link the shared contracts and source locations the implementer needs. Describe the local
implementation in order, covering all steps through delivery.>

1. <Name the files and symbols to change and the behavior the change must produce.>
2. <Describe the next edit and how it connects to the preceding result or an existing caller.>

## Verification

<For each necessary local check, give the input or action and the expected observation.
For a migration, include the behavior to preserve and how to compare it. Link any combined
check to its definition in the total plan.>
```
