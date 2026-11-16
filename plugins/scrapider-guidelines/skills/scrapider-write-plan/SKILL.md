---
name: scrapider-write-plan
description: Requires an enabled, authorized subagent mode. Use to write or revise a Scrapider execution plan when a coding change needs a durable handoff to implementation subagents.
---

# Write a Scrapider Execution Plan

Deliver a researched implementation handoff. Implementation and post-integration review belong to
`scrapider-execute-plan` when execution is requested.

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
defining the checks that exercise these paths. Give other material outcomes and failure, recovery or
compatibility cases owning work or an existing path and appropriate evidence, or name the specific gap.

Record the contracts the derived work shares, including relevant fields, types, units, transformations,
results and errors. For persisted or versioned data, establish which source governs later reads and
updates. Keep each detailed contract in its owning section and link its consumers. Use tables,
signatures, formulas, examples or code where they resolve consequential ambiguity.

Distinguish observed behavior, accepted decisions and proposals. A material unresolved choice needs
a concrete proposal, its effects, affected work and evidence needed to decide or release it. Include
alternatives when they change the decision. A choice that requires an exception to a constraint stays
pending. Scope the dependency to the work that actually requires a decision.

For behavior being replaced or migrated, provide a reusable before-change baseline: source or test
anchor, inputs/configuration, expected results and a comparison method. Include exceptions that
affect compatibility. Distinguish observed results, existing assertions and source-derived expectations;
schedule any required runtime capture before replacement.

## Derive assignments and deliveries

Group the required edits into assignments and name what each provides and who uses it. Define
deliveries by what can become usable together in the intended checkout. For a changed interface,
data shape or protocol, trace the producer and the existing consumers present at each proposed
handoff. Put changes that must land together in the same delivery, even
when they have separate file owners or Briefs. Split where the earlier state supports the consumers
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
is the destination of its contributions. Order conflicting writes where needed. Executor allocation
remains the caller's choice.

## Choose the plan format

| Work | Artifact |
| --- | --- |
| Clear, local work with an evident edit and check | Direct work with plan files only when a durable handoff is requested |
| Work needing researched decisions, ordered implementation or a durable handoff that fits one document | `PLAN.md` using the [single plan template](references/single-plan.md) |
| Work with substantial coordination across deliveries or assignments | Total `PLAN.md`, `briefs/<module>/<brief>.md` and sibling `REVIEW.md`; read the [modular templates](references/modular-plan.md) and [review template](references/review-plan.md) |

Use `.scrapider/plan/YYYY-MM-DD-<feature-name>/` at the project root for new plans, with the caller's
local creation date and a lowercase hyphenated name. Revise existing plans in their current directory.
A single plan gets a sibling `REVIEW.md` when the request, project rules or
[standards review criteria](../scrapider-guidelines/references/shared/standards-review.md#applicability--primary-agent)
call for review.

## Write the handoff

Use the chosen format to present the behavior, assignments and order already derived. Carry useful
findings into the handoff with verified source paths and symbols. Mark proposed files or symbols as new.
Use project-relative source paths and resolve document links from the file containing them.

- Give each planned **Modify / Create / Delete** action one authoritative owner. Define the exact path,
  target and purpose. In a single plan, keep the allocation at the owning step or in an inventory it
  uses as its write scope. In a modular plan, the total Plan allocates the change scope to Briefs as
  described below. Show moves as old path -> new path. Put read-only dependencies with the inputs or
  source anchors.
- Beside each assignment, supply the inputs, directly linked requirements and contracts, ordered edits,
  and usable output or contribution. Define path aliases where used. Repeated edits can share a procedure
  with a complete target list. Resolve missing contract details or name the evidence needed by the
  affected work.
- Define each check once, where its behavior can be exercised, with an owner, reproducible setup and
  expected observation. Link to it by the outcome or boundary it establishes, such as building the
  changed callers or recovering a run. Keep it with the assigned work for local evidence, or with
  acceptance for evidence that requires combined outputs. Reuse existing checks that reach the
  claimed outcome. Record unavailable required verification with the concrete case and missing prerequisite.
- Present the representative paths with the source anchors and decisive steps that informed the plan.
  Link the affected work and checks. Record any open condition and distinguish source-derived reasoning
  from observed test results.

In a single plan, define start inputs in the consuming steps and combined inputs at their checks or
activation conditions.

For modular work, establish the allocations in the total Plan before expanding Briefs. For each
Brief, assign the responsibility, permitted change scope, required inputs and output used by other
work. Allocate by the actual change, including shared data-access and infrastructure edits. Use file
paths and affected symbols wherever targets are shared across contributions. Give an overlapping edit
one owner. When different edits share a file, define their boundaries and any ordering or integration
responsibility. Record cross-Brief dependencies, combined acceptance and activation in the total Plan.

Each Brief links its allocation and expands it into concrete targets, ordered edits and local checks.
Keep shared contracts and cross-Brief inputs linked to their authoritative definitions. Implementation
choices within that allocation belong in the Brief. A newly discovered change outside it goes back to
the planning coordinator, who assigns the work in the total Plan and updates the affected Briefs in the
same revision. The coordinator can refine allocations as evidence develops.

Use the single Plan's steps or the modular delivery entry for execution state, assignee, output/version
reference, evidence and remaining work. Fill these during execution and keep the starting checkout and
baseline in the Plan. Record review dispositions in its existing Review entry.

Record a material adjustment and its reason at the owning decision, step or dependency. Changes to a
modular assignment's scope, shared contract, inputs or output start at its total-Plan allocation, then
flow into the affected Briefs. Update related checks and `REVIEW.md` in the same revision before affected
work is dispatched or resumed. Routine implementation detail stays in the steps.

## Finish the handoff

Make the plan usable from the assignments and their links. The coordinator can see which work can
start, what each delivery will make available and what evidence is still needed.

When the handoff's complexity or uncertainty warrants independent assessment, use the
[`scrapider-solution-expert`](../../agents/scrapider-solution-expert.md) subagent. Correct confirmed
gaps, synchronize the affected documents and recheck changed paths before delivery. Link the resulting
plan and identify any remaining implementation prerequisites.
