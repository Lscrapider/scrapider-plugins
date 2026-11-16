# Single Plan

Use the headings that help present the already derived behavior and work. Give each assignment its
start inputs, file actions and result together. If a file inventory helps navigation, link to the
owning actions or make the inventory the write scope used by the steps.

```markdown
---
mode: single
---

# <Change name>

## Outcome and scope

<Requested behavior, constraints and boundaries. Link material observable outcomes, including distinct
failure and preservation cases, to their owning work and evidence. Use concise references where helpful.>

**Execution context** <Fill at execution start: checkout and starting workspace baseline reference,
including pre-existing edits.>

## Target behavior and contracts

<Current -> target behavior, component responsibilities and the paths that informed key decisions.
Define the shared semantics the steps need, including relevant data ownership, transformations and
outcomes. Link authoritative definitions and relevant scenarios. Use tables or examples where helpful.>

<Pending decisions, if any: proposal, effects, affected steps and release evidence.>

## Preservation baseline

<For replacement/migration: source or test anchor, reusable inputs/configuration, expected results
and comparison check. Label observed results, existing assertions and source-derived expectations.>

## Steps

### T01 <Result or contribution>

- **Inputs** <Actual inputs needed to start this step. Link each prerequisite to its existing source,
  agreed contract or producing step. Put read-only references here.>
- **Files** <Owned Create / Modify / Delete actions, exact paths and affected symbols, including
  callers. If an inventory owns an action, link the entry that defines this step's scope.>
- **Implement** <Ordered changes and wiring using the linked contracts.>
- **Output and verification** <What this step provides, who uses it and which delivery it contributes
  to. Define a local check with any inputs it consumes, or link the applicable combined check.>
- **Progress/evidence** Pending. <During execution, record assignee, output/version reference, check
  evidence and remaining work. Reuse the execution context unless the checkout differs.>

## Acceptance

<Define checks needing combined work here. Put later prerequisites with the check or activation that
uses them. Link applicable local checks and reuse the expected observations in relevant scenarios.>

- [ ] **<Descriptive outcome or boundary>** <Requirement link, owner, reproducible procedure and
  setup for the combined result> -> <Expected observation and evidence to collect.>
- **Gaps** <Missing coverage, authorization or environment, and the remaining acceptance condition.>
- **Review** <Link REVIEW.md and its integration trigger when applicable.>
  <During execution, record returned findings here: finding reference -> disposition and reason or
  fix/recheck evidence; impact, owner and next action for open/deferred items.>

## Representative scenarios

- **C01** <Concrete input and starting state -> actual entry point and decisive operation, with source
  or contract links -> observable result. For a refusal, show the guard and the effects it prevents.
  Link the affected steps and checks and name any unresolved condition. Record observed execution
  results with their checks.>
```
