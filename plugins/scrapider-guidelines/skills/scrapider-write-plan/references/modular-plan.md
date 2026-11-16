# Modular Plan and Implementation Briefs

Present the already derived behavior and work. Establish assignments and change ownership in the total
Plan, then expand the allocated work in Briefs. The total Plan owns cross-Brief dependencies, shared
contracts and integration or activation conditions. Briefs supply implementation detail and local
checks within their allocations. Use the sections that help the handoff and link authoritative definitions.

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
| D01 | <Applicable decision, with a meaningful alternative if needed> | <Consequence and Brief/step IDs> | <Decision source or evidence still required> |

## Deliveries and handoffs

<Group assignments by the result that must become usable together. Define each allocation here, with
an anchor its Brief can link. A delivery may contain several Briefs.>

### <Delivery ID and usable result>

<Describe the combined result, its consumers and applicable acceptance. Put the conditions for
integration or activation with that activity.>

| Assignment and Brief | Allocated changes | Start inputs and contribution | Progress and evidence |
| --- | --- | --- | --- |
| <Assignment ID and Brief link> | <Responsibility and permitted change scope. Identify paths and symbols for shared targets.> | <Actual start inputs and their sources, output provided and its consumers.> | Pending |

<Allocate each shared edit to an owner. If different assignments edit the same file, specify their
targets and any ordering or integration responsibility here. Consumers link to the allocated producer.
Show work that can start independently. A newly discovered cross-assignment change updates this
allocation and the affected Briefs together.>

<During execution, use Progress and evidence for state, assignee, completed/remaining step IDs,
output/version reference, check evidence and unmet release conditions. Reuse the execution context
unless the checkout differs.>

## Integration and review

<Define integration-owned checks and the inputs they use here. Link to checks owned by a Brief and
reuse the expected observations in relevant scenarios.>

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
- **References** <Affected Briefs or steps and checks that exercise this path. Record observed execution
  results with those checks.>
```

## Implementation Brief

An implementer receives this Brief and its direct links. Start from the total Plan's allocation and
expand the assigned work. Send additional scope or changed cross-Brief requirements to the coordinator
for allocation in the total Plan. Local implementation choices remain in this Brief.

```markdown
# <Brief ID> <Assigned result or contribution>

## Scope and inputs

<Purpose of this contribution and relevant source anchors.>

- **Assignment** <Link the total-Plan entry that assigns this Brief its change scope, inputs, output
  and delivery.>
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

- **Produces** <How to use the allocated output and where to find it and its evidence. Link the
  total-Plan contribution and any work needed with it.>
- **Return** <Completed/remaining step IDs, output/version reference, checks/evidence, applicable scenario
  references and blockers. Link material adjustments and reasons at their owning decision or step;
  the coordinator updates the total Plan's progress and affected dispatch conditions before dependent work proceeds.>
```
