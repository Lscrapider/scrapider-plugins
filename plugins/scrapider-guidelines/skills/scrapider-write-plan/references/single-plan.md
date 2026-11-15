# Single Plan

Use task-specific content under the headings that apply. Complete the implementation and acceptance
draft before selecting scenarios; record the walkthrough and resulting corrections before delivery.

```markdown
---
mode: single
---

# <Change name>

## File changes

| Action | ID and exact project-relative path | Step IDs | Purpose |
| --- | --- | --- | --- |
| Modify | F01 `<existing file>` | <IDs> | <Change> |
| Create | F02 `<new file>` | <IDs> | <Responsibility> |
| Delete | F03 `<existing file>` | <IDs> | <Reason/replacement> |

<Omit unused rows, or this section when actions are fully defined in their owning steps. With an
inventory, steps reference IDs instead of repeating paths and purposes. Include affected callers;
show moves as old path -> new path. Keep read-only evidence separate.>

## Outcome and scope

<Requested behavior, constraints and boundaries. Link requirements to owning steps and acceptance;
concise references or a small table are sufficient.>

**Execution context** <Fill at execution start: checkout and starting workspace baseline reference,
including pre-existing edits.>

## Target behavior and contracts

<Current -> target behavior and component responsibilities. Define the shared semantics the steps
need, including relevant data ownership, transformations and outcomes. Link authoritative definitions;
use tables or examples where they clarify the change.>

<Pending decisions, if any: proposal, effects, affected steps and release evidence.>

## Preservation baseline

<For replacement/migration: source or test anchor, reusable inputs/configuration, expected results
and comparison check. Label observed results, existing assertions and source-derived expectations.>

## Steps

- **T01 <Deliverable>**
  - **Files** <Inventory IDs and target symbols; without an inventory, define actions, exact paths
    and purpose here.>
  - **Start when** <Ready, or links to required decisions, contracts and upstream outputs with release evidence;
    distinguish approved decisions, defined contracts and implemented outputs.>
  - **Implement** <Ordered changes and wiring using the linked contract.>
  - **Verify** <Acceptance/check reference, local inputs and assertions if not defined below.>
  - **Progress/evidence** Pending. <During execution: assignee, output/version reference, check evidence and
    remaining work or release conditions; reuse the execution context unless the checkout differs.>

## Acceptance

- [ ] **V01 - <requirement/contract and owner>** <Command or reproducible procedure and setup> ->
  <Expected result, boundary covered and evidence to collect.>
- **Gaps** <Missing coverage, authorization or environment, and the remaining acceptance condition.>
- **Review** <Link REVIEW.md and its integration trigger when applicable.>
  <During execution, record returned findings here: finding reference -> disposition and reason or
  fix/recheck evidence; impact, owner and next action for open/deferred items.>

## Representative scenarios

- **C01** <Concrete input and trigger -> relevant processing -> observable result; steps/checks exercised.>

## Static walkthrough

| Scenario | Decisive source/contract anchors and intermediate values or states | Finding and resolution |
| --- | --- | --- |
| C01 | <Evidence supporting the proposed path> | <Connected, conditional on a named decision, or gap and affected work> |

<Also confirm full requirement coverage. Scenarios sample that scope; the walkthrough records
planning evidence, not runtime results. Apply corrections to the affected steps and checks.>
```
