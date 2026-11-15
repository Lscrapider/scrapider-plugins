---
name: scrapider-write-plan
description: Requires an enabled, authorized subagent mode. Use to write or revise a Scrapider execution plan when a coding change needs a durable handoff to implementation subagents.
---

# Write a Scrapider Execution Plan

Deliver a researched implementation handoff. Draft the plan, select representative scenarios,
walk them through the draft, and resolve the findings before delivery. Implementation and
post-integration review belong to `scrapider-execute-plan` when execution is requested.

## Choose the plan format

| Work | Artifact |
| --- | --- |
| Clear, local work with an evident edit and check | Direct work; no plan files unless a durable handoff is requested |
| Work needing researched decisions, ordered implementation or a durable handoff that fits one document | `PLAN.md` using the [single plan template](references/single-plan.md) |
| Work spanning distinct delivery boundaries and substantial coordination | Total `PLAN.md`, `briefs/<module>/<brief>.md` and sibling `REVIEW.md`; read the [modular templates](references/modular-plan.md) and [review template](references/review-plan.md) |

Use `.scrapider/plan/YYYY-MM-DD-<feature-name>/` at the project root for new plans, with the caller's
local creation date and a lowercase hyphenated name. Revise existing plans in their current directory.
A single plan gets a sibling `REVIEW.md` when the request, project rules or
[standards review criteria](../scrapider-guidelines/references/shared/standards-review.md#applicability--primary-agent)
call for review.

## Establish the design and delivery boundaries

Start from the request, applicable project instructions and relevant source evidence. Describe the
full target behavior, constraints and preservation obligations, and connect them to owning tasks
and acceptance. Existing specifications can supply this information when applicable.

Inspect the entry points, affected callers and checks needed for the proposed change. Carry useful
findings into the handoff with verified source paths and symbols. Mark proposed files or symbols
as new. Use project-relative source paths and document-relative links.

Define the shared semantics implementation depends on: producers and consumers, relevant fields,
types and units, transformations, results and errors. For persisted or versioned data, establish
which source governs later reads and updates. Keep each detailed contract in one authoritative
section and link its consumers. Use tables, signatures, formulas or examples when they clarify the
contract; include code only where it resolves consequential ambiguity.

Separate established behavior and accepted decisions from proposals. A material unresolved choice
needs a concrete proposal, its effects, affected tasks and release evidence; include alternatives
when they change the decision. Gate the affected implementation. A planning handoff may contain
explicit pending decisions without treating them as approved.

For behavior being replaced or migrated, provide a reusable before-change baseline: source or test
anchor, inputs/configuration, expected results and a comparison method. Include exceptions that
affect compatibility. Distinguish observed results, existing assertions and source-derived expectations;
schedule any required runtime capture before replacement.

Split work by deliverable and write ownership. Keep an interface change with the callers needed
for a buildable result, or define usable intermediate deliveries. Name upstream outputs and evidence
needed by consumers, and order shared writes. Executor count and grouping remain the caller's choice.

## Write the handoff

- Define **Modify / Create / Delete** file actions once per single Plan or Brief, with exact paths,
  owning step IDs and purpose; show moves as old path -> new path. Use an inventory for shared targets
  or a useful write-scope overview; otherwise define actions in their owning steps. Steps reference
  inventory IDs when present, adding target symbols and procedure. Include constructors, projections,
  converters and test callers affected by shared types. Keep read-only references separate and modular
  inventories in Briefs.
- Give ordered implementation steps with source anchors, the contract used and the expected result.
  Repeated edits can share a procedure with a complete target list.
- Make each Brief readable with its directly linked requirements, contracts, decisions and baselines.
  Define path aliases where used. Resolve missing contract details during planning or mark the affected
  work waiting with the evidence needed to proceed.
- Give each deliverable an appropriate check: owner, command or reproducible procedure, inputs and
  expected outcome. Evidence must exercise the boundary claimed. Implementation owns local checks;
  integration owns combined-output checks. Review assesses those results.
- Reuse existing checks where suitable; specify necessary additions and remaining gaps under project
  authorization. Test order follows the verification need, including before-change baselines. Required
  verification lacking an environment or authorization remains an explicit acceptance condition.

For modular work, the total Plan explains the full behavior, module connections, each Brief's
deliverable and acceptance, and all dispatch prerequisites. It owns progress and evidence pointers.
Briefs own implementation detail and link the total Plan's applicable release conditions rather than
redefining them. Make consumed inputs and usable outputs explicit at each handoff, with contract links.

Use the single Plan's steps or the modular index for execution state, assignee, output/version reference,
check evidence and remaining work or release conditions. Fill these during execution; keep the starting
checkout/baseline reference once in the Plan. Record review dispositions in its existing Review entry.

Changes to a Brief's scope, behavior, interfaces, dependencies or acceptance must update that
coordination view in the same revision, before affected work is dispatched or resumed. Update
related contracts, checks and `REVIEW.md` when affected. Record each material accepted adjustment and
its reason beside the affected decision or step; link it from other views.
Routine implementation detail stays in the steps; it needs no separate change log.

## Check the completed draft

Complete the tasks, Briefs, contracts and acceptance before selecting walkthrough scenarios.
Choose representative paths from the requirements and realistic use. For each, record concrete
input, the relevant processing and observable outcome, with links to the steps and checks exercised.
A sampled new capability should have a case that distinguishes it from the previous behavior.

Check three things:

1. **Requirement coverage.** Requested capabilities and material constraints have implementation and
   acceptance, or a specific pending decision. Representative paths are only a sample of this scope.
2. **Scenario walkthrough.** Follow concrete values and states through the planned changes and source
   anchors. Record the decisive evidence and any gap; static reasoning is distinct from an executed test.
3. **Handoff completeness.** An implementer can work from the assignment and its links. For modular work,
   the coordinator can explain behavior, readiness and acceptance from the total Plan. Cross-check the
   Briefs' scope and prerequisites against that view.

When the handoff's complexity or uncertainty warrants independent assessment, use the
[`scrapider-solution-expert`](../../agents/scrapider-solution-expert.md) subagent. Correct confirmed
gaps, synchronize the affected documents and recheck changed paths before delivery. Link the resulting
plan and identify any remaining implementation prerequisites.
