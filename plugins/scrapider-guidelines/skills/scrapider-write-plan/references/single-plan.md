# Single Plan

Use the headings that help present the work. Give each step a stable ID such as `T01`, with its
inputs, file actions and completion criteria together.

```markdown
---
mode: single
---

# <Change name>

## Outcome and scope

<Requested behavior, constraints and boundaries. Link the required outcomes, including relevant
failure and preservation cases, to their steps and acceptance criteria.>

## Target behavior and contracts

<Current -> target behavior, component responsibilities and the paths that informed key decisions.
Define the shared semantics the steps need, including relevant data ownership, transformations and
outcomes. Link authoritative definitions and relevant scenarios. Use tables or examples where helpful.>

<If a decision is still needed, give the proposal, its effects and the steps that depend on it.>

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
- **Output and verification** <What this step provides and who uses it. Give the local check and
  expected observation, or link the applicable combined check.>

## Acceptance

<Define checks needing combined work here. Put later prerequisites with the check or activation that
uses them. Link applicable local checks and reuse the expected observations in relevant scenarios.>

- **<Outcome or boundary>** <Requirement, relevant setup, action and expected observable result.>
- **Prerequisites** <Any authorization or environment required for this check.>
- **Review** <Link REVIEW.md when applicable.>

## Representative scenarios

- **C01** <Concrete input and starting state -> actual entry point and decisive operation, with source
  or contract links -> observable result. For a refusal, show the guard and the effects it prevents.
  Link the affected steps and checks and name any unresolved condition.>
```
