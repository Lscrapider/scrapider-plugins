# Modular Plan and Implementation Briefs

The primary agent dispatches from `PLAN.md`. Give each module a stable Brief ID and a link to
`briefs/<brief-name>.md`. The module's implementer reads that Brief for all implementation steps.
Define shared contracts once and link to the same definition from the producer and each consumer.

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

<Name the producer and consumers of each shared interface. Link its existing definition or
specify its exact signature or payload here, including field names, types and nesting. Include
data ownership and cross-module guarantees where relevant.>

## Module assignments

### B01

**Brief** [Order import](briefs/order-import.md)

- **Goal and write scope** <What the module delivers and which paths it owns. Identify symbols
  and ordering where modules share a file.>
- **Dependencies** <What can start immediately, which contract or upstream output is needed,
  and when it is needed.>
- **Completion criteria** <The whole Brief's observable output, what its consumers can rely
  on and the checks that establish this module's part. Link applicable requirements.>

<Give each additional module its own ID, Brief and allocation.>

## Integration and acceptance

<Which outputs must work together, where they are consumed, and what combined check demonstrates
the requested behavior. Include any environment or activation prerequisite with the check it affects.>

[Review assignments](REVIEW.md)
```

## Module Brief

For the example above, write `briefs/order-import.md` using its ID from the total plan.
The implementer reads the Brief, completes its steps and replies directly to the primary agent
in the host conversation with the functionality delivered, check results and any blockers.

```markdown
# B01 Order import

**Assignment** [Scope, dependencies and completion criteria](../PLAN.md#b01)

## Inputs and implementation

- **Consumes** <Producing assignment and link to the agreed interface this module uses.>
- **Produces** <Consuming assignments and link to the agreed interface this module provides.>

<Give other necessary inputs and source locations. Describe the local implementation in order,
covering all steps through delivery.>

1. <Name the files and symbols to change and the behavior the change must produce.>
2. <Describe the next edit and how it connects to the preceding result or an existing caller.>

## Verification

<For each check the implementer can run on this module, give the input or action and the
expected observation. For a migration, include the behavior to preserve and how to compare it.
For behavior verified across modules, link to the corresponding check under Integration and
acceptance.>
```
