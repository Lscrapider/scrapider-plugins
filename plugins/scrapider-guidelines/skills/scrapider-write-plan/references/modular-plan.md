# Modular Plan and Implementation Briefs

The total Plan supports coordination; Briefs support implementation. Use task-specific content and
omit inapplicable sections. Draft both the total Plan and actual Briefs before choosing scenarios.
Detailed contracts have one authoritative location, linked by their consumers.

## Total `PLAN.md`

```markdown
---
mode: modular
---

# <Change name>

## Outcome and scope

<Full requested behavior, constraints, preservation obligations and boundaries. Map requirements
to Briefs/steps and acceptance with concise references or a small table.>

**Execution context** <Fill at execution start: consuming/integration checkout and starting workspace
baseline reference, including pre-existing edits.>

## Target behavior and connections

<Explain the feature's behavior and each participating module's responsibility, including important
branches beyond the selected scenarios. Summarize shared contracts sufficiently for coordination.>

| Boundary | Producer -> consumer and behavioral guarantee | Detailed contract |
| --- | --- | --- |
| <Boundary> | <Relevant data, transformation, authority and timing> | <Section link> |

<Use the table where useful; keep detailed definitions in their owning section.>

## Decisions and release conditions

| Decision | Status and proposal/accepted behavior | Impact and affected work | Release evidence |
| --- | --- | --- | --- |
| D01 | <Applicable decision, with a meaningful alternative if needed> | <Consequence and Brief/step IDs> | <Decision source or evidence still required> |

## Modules and handoffs

### M01 <Delivery boundary>

<Requirements owned, current -> target behavior, key source anchors, consumed/produced outputs and
write ownership. Define buildable handoffs and shared-write ordering.>

| Brief | Deliverable and acceptance | Start when | Progress and evidence |
| --- | --- | --- | --- |
| [M01-B01 <Name>](briefs/<module>/<brief>.md) | <Usable result and check links> | <Required decisions, upstream/local inputs and release evidence; ready partial steps if any> | Pending |

<Include every Brief prerequisite that affects dispatch. Distinguish a defined contract from an
implemented output. Update this coordination view with scope, dependency and acceptance changes;
file inventories remain in Briefs.>

<During execution, use Progress and evidence for state, assignee, completed/remaining step IDs,
output/version reference, check evidence and unmet release conditions. Reuse the execution context
unless the checkout differs.>

## Integration and review

- [ ] **V01 - <requirement/contract and owner>** <Check/procedure, setup and inputs> ->
  <Expected result, actual boundary covered and evidence.>
- **Gaps** <Missing coverage or execution prerequisites and resulting acceptance conditions.>
- **Review** After integration, the primary agent reads [REVIEW.md](REVIEW.md) and dispatches
  functional and standards reviews with available evidence and gaps. Required verification still
  governs final acceptance.
  <During execution, record returned findings here: finding reference -> disposition and reason or
  fix/recheck evidence; impact, owner and next action for open/deferred items.>

## Representative scenarios

### C01 <Path to check>

- **Input and trigger** <Concrete starting conditions and action.>
- **Path and outcome** <Actual entry point, affected interactions and observable result.>
- **References** <Drafted Brief/steps, contracts and checks exercised.>

## Static walkthrough

| Scenario | Decisive source/contract anchors and intermediate values or states | Finding and resolution |
| --- | --- | --- |
| C01 | <Evidence supporting the proposed path> | <Connected, conditional on a named decision, or gap and affected work> |

<Check full requirement coverage and total Plan/Brief consistency separately from the sampled paths.
Record corrections and any independent review used; runtime evidence is collected during implementation.>
```

## Implementation Brief

An implementer receives this Brief and its direct links. Put each contract definition in its owner
and link the exact sections needed here.

```markdown
# <Brief ID> <Deliverable>

## File changes

| Action | ID and exact project-relative path | Step IDs | Purpose |
| --- | --- | --- | --- |
| Modify | F01 `<existing file>` | <IDs> | <Change> |
| Create | F02 `<new file>` | <IDs> | <Responsibility> |
| Delete | F03 `<existing file>` | <IDs> | <Reason/replacement> |

<Omit unused rows, or this section when actions are fully defined in their owning steps. With an
inventory, steps reference IDs instead of repeating paths and purposes. Include affected callers;
show moves as old path -> new path. Keep read-only evidence separate.>

## Scope and inputs

<Assigned requirements, observable deliverable, source anchors and write ownership.>

- **Read first** <Direct links to required contracts, decisions, baselines and applicable rules.>
- **Consumes** <Required upstream/local outputs and their authoritative contract links.>
- **Start when** <Link the total-plan prerequisites and ready partial-step IDs; add how readiness is
  checked for this Brief, keeping all dispatch conditions in that total-plan entry.>

## Contract and preserved behavior

<Define the shared semantics owned here, or link their authoritative section. For migrations, link
or supply reusable before-change cases and a comparison check, distinguishing observed from derived results.>

## Steps

- **<Step ID> <Deliverable>**
  - **Files** <Inventory IDs and target symbols; without an inventory, define actions, exact paths
    and purpose here.>
  - **Implement** <Ordered changes and wiring using the linked contract.>
  - **Verify** <Check reference, local setup/assertions if needed, and any integration evidence still required.>

## Delivery and downstream use

- **Produces** <Usable outputs, contract links and their consumers.>
- **Return** <Completed/remaining step IDs, output/version reference, checks/evidence, applicable scenario
  references and blockers. Link material adjustments and reasons at their owning decision or step;
  the coordinator updates the total Plan's progress and affected dispatch conditions before dependent work proceeds.>
```
