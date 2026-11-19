# Modular Plan and Implementation Briefs

Present the already derived behavior and work. Establish assignments and change ownership in the total
Plan, then expand the allocated work in Briefs. The total Plan owns cross-Brief dependencies, shared
contracts and integration or activation conditions. Briefs supply implementation detail and local
checks within their allocations. Use the sections that help the handoff and link authoritative definitions.

Each directory directly under `briefs/` is one Brief that can advance alongside the others. Default
to one `01-<title>.md` document per Brief. When the workload and context needs require splitting a
large assignment, use numbered documents in that directory. Each document is assigned to a separate
implementation subagent, and the documents within a Brief run serially. Keep related small tasks and
their checks in the same document.

## Structure example

Here, agreed interfaces and compatible write scopes allow three Briefs to advance in parallel.
`order-import` has enough implementation and verification work to need three assignments. Each of
the other Briefs fits in one document.

```text
PLAN.md                              # mode: modular
REVIEW.md
briefs/
├── order-import/
│   ├── 01-schema.md                  # Agent A
│   ├── 02-write-path.md              # Agent B, after A
│   └── 03-recovery.md                # Agent C, after B
├── order-worker/
│   └── 01-import-worker.md           # Agent D
└── web/
    └── 01-import-console.md          # Agent E
```

With three implementation slots, the primary agent can start A, D and E together. It confirms A's
output and verification before starting B, then B's before C. Each subagent completes all steps and
local checks in its document. The primary agent records the handoffs, integrates the outputs and
organizes final verification and review.

## Total `PLAN.md`

```markdown
---
mode: modular
---

# <Change name>

## Outcome and scope

<Full requested behavior, constraints and boundaries. Link material observable outcomes, including
distinct failure and preservation cases, to the owning work and acceptance evidence.>

**Execution context** <Fill at execution start: consuming/integration checkout and starting workspace
baseline reference, including pre-existing edits.>

## Target behavior and connections

<Explain the full target behavior and each participating module's responsibility. Link the paths that
informed key decisions. Summarize shared contracts sufficiently for coordination.>

| Boundary | Producer -> consumer and behavioral guarantee | Detailed contract |
| --- | --- | --- |
| <Boundary> | <Relevant data, transformation, authority and timing> | <Section link> |

<Use the table where useful; keep detailed definitions in their owning section.>

## Decisions and release conditions

| Decision | Status and proposal/accepted behavior | Impact and affected work | Release evidence |
| --- | --- | --- | --- |
| D01 | <Applicable decision, with a meaningful alternative if needed> | <Consequence and affected Briefs, documents or steps> | <Decision source or evidence still required> |

## Deliveries and handoffs

<Group assignments by the result that must become usable together. Give each Brief its own allocation
with an anchor it can link. A delivery may contain several Briefs.>

### <Delivery ID and usable result>

<Describe the combined result, its consumers and applicable acceptance. Put the conditions for
integration or activation with that activity.>

| Brief | Allocated changes | Start inputs and contribution | Progress and evidence |
| --- | --- | --- | --- |
| <Brief ID and directory link> | <Responsibility and permitted change scope. Identify paths and symbols for shared targets.> | <Actual start inputs and their sources, output provided and its consumers.> | Pending |

<Allocate each shared edit to an owner. If different assignments edit the same file, specify their
targets and any ordering or integration responsibility here. Consumers link to the allocated producer.
Show which Briefs can advance in parallel. Link later cross-Brief prerequisites to the consuming
document or check. A newly discovered cross-assignment change updates this allocation and the affected
documents together.>

<During execution, use Progress and evidence for each document's filename, state, assignee,
completed/remaining steps, output/version reference, check evidence and unmet release conditions.
Use these records for the handoff to the next document's implementer. Reuse the execution context
unless the checkout differs.>

## Integration and review

<Define integration-owned checks and the inputs they use here. Link to local checks in their owning
implementation documents and reuse the expected observations in relevant scenarios.>

- [ ] **<Descriptive outcome or boundary>** <Requirement link, owner, reproducible procedure and setup for
  the combined result> -> <Expected observation and evidence to collect.>
- **Gaps** <Missing coverage or execution prerequisites and resulting acceptance conditions.>
- **Review** After integration, the primary agent reads [REVIEW.md](REVIEW.md) and dispatches
  functional and standards reviews with available evidence and gaps. Required verification still
  governs final acceptance.
  <During execution, record returned findings here: finding reference -> disposition and reason or
  fix/recheck evidence; impact, owner and next action for open/deferred items.>

## Representative scenarios

### C01 <Behavior illustrated>

- **Input and trigger** <Concrete starting state and action at the actual entry point.>
- **Path and outcome** <Decisive operation and observable result, with source or contract links. For a
  refusal, show the guard and the effects it prevents. Name any unresolved condition.>
- **References** <Affected implementation documents and their steps and checks that exercise this path.
  Record observed execution results with those checks.>
```

## Implementation document

Use this template for `briefs/<brief-name>/01-<title>.md` and any additional documents justified by the
workload. Each implementer receives its assigned document, the Brief's allocation link and relevant
inputs and predecessor results. Keep the Brief's shared scope, inputs and output in the total Plan's
allocation.

```markdown
# <Brief ID> / <Document number> <Assigned result or contribution>

## Scope and inputs

<Purpose of this contribution and relevant source anchors.>

- **Assignment** <Link the total-Plan entry that assigns this Brief its change scope, inputs, output
  and delivery.>
- **Inputs** <Required outputs from preceding documents and any other prerequisites for this work.>
- **References** <Direct links to the shared contracts, producing assignments, decisions and baselines
  this implementation uses. Define local prerequisites with the step or check that uses them.>

## Contract and preserved behavior

<Link the governing shared contracts. Explain local behavior needed to implement this assignment and
its preservation baseline. A proposed change to a shared contract goes through its total-Plan owner.
For migrations, distinguish observed baseline results from source-derived expectations.>

## Steps

- **<Step ID> <Result or contribution>**
  - **Targets** <Exact files and symbols within the linked allocation that this step edits. Reference
    shared targets by their allocated action. Put consumed code in the references above.>
  - **Implement** <Ordered changes and wiring using the linked contract.>
  - **Verify** <Define the local check if this step owns it. Otherwise link the existing check that
    applies to the step.>

## Delivery and downstream use

- **Produces** <This document's output and verification evidence, including what the next document's
  implementer needs to continue. Link the total-Plan contribution and any work needed with it.>
- **Return** <Completed/remaining step IDs, output/version reference, checks/evidence, applicable scenario
  references and blockers. Link material adjustments and reasons at their owning decision or step;
  the coordinator updates the total Plan's progress and affected dispatch conditions before dependent work proceeds.>
```
