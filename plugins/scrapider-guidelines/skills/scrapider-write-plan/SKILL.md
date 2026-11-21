---
name: scrapider-write-plan
description: Requires an enabled, authorized subagent mode. Use to prepare or refine a draft Scrapider plan when a coding change needs a durable handoff to implementation subagents.
---

# Write a Scrapider Execution Plan

Write `PLAN.md` so the primary agent can dispatch the full scope from it. **Settle interfaces
between assignments before presenting the plan for confirmation.** In a modular plan, choose
Brief boundaries so implementers can work in parallel using available inputs or agreed interfaces.
Give each module one Brief with all the steps its implementer needs to deliver it.

**Confirmation freezes the plan and its companion documents.** During execution, only the
primary agent may correct an implementation instruction that project facts prove wrong. Replace
only that instruction in its original location, within the agreed scope, contracts and acceptance
criteria. [Plan execution](../scrapider-execute-plan/SKILL.md) governs dispatch and review.

## Derive the change from behavior

Start from the request, applicable project instructions and relevant source evidence. Identify the
requested outcomes, material behavior to preserve and constraints that shape the design. Link the
applicable parts of existing specifications. Inspect the actual entry points, affected callers, module
dependencies and existing checks where they determine the result or constrain the approach.

Use representative inputs and existing state to work out consequential behavior before defining
assignments. Follow the actual entry point to the operation that decides the result, then work out
what must change for the intended outcome to follow. For example, when scoping a lookup turns a hit
into a miss, follow the miss through record creation and the uniqueness rules the write encounters.
Derive the necessary edits together, accounting for concurrent writes, old records and existing writers
where relevant. Choose an approach that fits the observed caller and module boundaries and the request's
constraints.

Trace intended success and the material refusals the behavior requires. Use the actual input shape and
satisfy unrelated prerequisites so a refusal reaches the decisive guard. Identify the observable
rejection and the effects that the guard prevents. A sampled new capability should have a case that
distinguishes it from the previous behavior. Use the same inputs and expected observations when
defining the checks that exercise these paths. Account for other required outcomes, including
failure, recovery or compatibility cases, in the assignments and acceptance criteria.

For each shared interface, identify the producer and its consumers. Link an existing type or
schema that defines the contract, or define it once in the plan. For a call, give the exact
signature, including parameter names and types and the return type. For APIs and messages,
specify the request, response or event shape down to the names, types and nesting of the fields
the other side uses. Include relevant units, transformations and error behavior. For persisted
or versioned data, establish which source governs later reads and updates.

Distinguish observed behavior, accepted decisions and proposals. A material unresolved choice needs
a concrete proposal, its effects, affected work and evidence needed to decide or release it. Include
alternatives when they change the decision. A choice that requires an exception to a constraint stays
pending. Scope the dependency to the work that actually requires a decision.

For behavior being replaced or migrated, identify the source or existing check, inputs, expected
results and comparison that establish the baseline. Include exceptions that affect compatibility.
Distinguish observed results from source-derived expectations.

## Derive assignments and deliveries

Group the required edits into assignments and name what each provides and who uses it. Define
deliveries by what can become usable together in the intended checkout. For a changed interface,
data shape or protocol, trace the producer and the existing consumers present at each proposed
handoff. Put changes that must land together in the same delivery, even
when they have separate file owners or Briefs. An earlier delivery must support the consumers
present at that point. Use a temporary compatibility path only for an in-scope consumer or rollout
that requires coexistence. Place the combined check after the edits it depends on.

Name the inputs each activity actually needs and link their sources. An input may come from an
existing fact, an agreed contract, a specific planned output or an external condition. Derive the order
from those relationships and show what can start independently. An agreed contract may let a caller
start while the producer is being implemented. A combined check needs the edits it exercises in the
consuming checkout. An environment input needed for verification or activation belongs with that
activity.

Follow planned inputs back to their producers. If an input leads back to the work that needs it,
identify an earlier result that can exist on its own or revise the work boundary. A shared delivery
is the destination of its contributions. Order conflicting writes where needed.

## Choose the plan format

| Work | Artifact |
| --- | --- |
| Clear, local work with an evident edit and check | Direct work with plan files only when a durable handoff is requested |
| Work needing researched decisions, ordered implementation or a durable handoff that fits one document | `PLAN.md` using the [single plan template](references/single-plan.md) |
| Module assignments that can advance in parallel and need coordinated delivery | Total `PLAN.md`, one `briefs/<brief-name>.md` per module and sibling `REVIEW.md`. Use the [modular templates](references/modular-plan.md) and [review template](references/review-plan.md). |

Use `.scrapider/plan/YYYY-MM-DD-<feature-name>/` at the project root for new plans, with the caller's
local creation date and a lowercase hyphenated name. Refine existing drafts in their current directory.
For a single plan, use the [review template](references/review-plan.md) for a sibling `REVIEW.md`
when the request, project rules or
[standards review criteria](../scrapider-guidelines/references/shared/standards-review.md#applicability--primary-agent)
call for review.

## Write the handoff

Use the chosen format to present the behavior, assignments and order already derived. Carry useful
findings into the handoff with verified source paths and symbols. Mark proposed files or symbols as new.
Use project-relative source paths and resolve document links from the file containing them.

- Give each planned file change one owner. Identify the operation, path, target and purpose, including both
  paths for a move. When assignments share a file, specify the affected symbols and write order.
- In a single plan, give each step a stable ID, required inputs, file actions, ordered edits and
  an observable result. Place prerequisites for a combined check with that check.
- In a modular plan, give each module a stable Brief ID in the total `PLAN.md`. Link the Brief
  and state its goal, write scope, dependencies, output and completion criteria. Identify what
  can start together, what needs a prior output, and which changes must be integrated together.
- In the Brief, link its allocation and the definitions of the interfaces it consumes and produces.
  Put the module's concrete targets, implementation details and ordered steps here. A repeated edit
  can share one procedure with a complete target list. One implementer should be able to deliver
  the whole Brief from it.
- Define each necessary check once. Put local checks with the implementation and combined checks
  with integration. Give the relevant input, prerequisite and observable result. Reuse checks that
  exercise the behavior and follow project rules and user authorization for verification.
- Give reviewers the scope, requirements and questions specific to this change in `REVIEW.md` when
  applicable. Link shared definitions and the relevant acceptance criteria at their source.

## Finish the handoff

Before confirmation, the plan author checks each consumer's expected inputs against the
producer's declared outputs. Compare signatures, types, field names and nesting. Resolve missing
or conflicting interface details in the draft. If an interface depends on a business decision
from the user, obtain it before finalizing that interface.

Check that the assignments cover every requested outcome and that their dependencies and
completion criteria are usable. Identify any missing prerequisite for the affected assignment.

When the draft's complexity or uncertainty warrants independent assessment, use the
[`scrapider-solution-expert`](../../agents/scrapider-solution-expert.md) subagent. Resolve confirmed
gaps in the draft and return the plan path and any outstanding decisions.
