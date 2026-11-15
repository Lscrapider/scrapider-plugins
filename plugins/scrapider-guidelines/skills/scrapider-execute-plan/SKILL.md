---
name: scrapider-execute-plan
description: Requires an enabled, authorized subagent mode. Use to execute or resume a Scrapider plan, coordinating implementation, verification, and review through subagents. Discover plans under .scrapider/plan or use a supplied plan path.
---

# Execute a Scrapider Plan

The primary agent coordinates implementation, integration and review through the host's native
subagents. The caller controls executor allocation and concurrency.

## Resolve the plan

Read applicable project instructions and the supplied `PLAN.md`. Otherwise locate the plan under
`.scrapider/plan/YYYY-MM-DD-<feature-name>/` from the task; resolve ambiguous matches before dispatch.
Confirm the checkout and scope. At execution start, record the checkout and starting workspace baseline
in the Plan, including pre-existing edits. On resumption, use its progress/evidence records to verify
outputs in the consuming checkout and that checks still apply. Resume unfinished work whose prerequisites
are met; reopen only affected work when outputs or evidence no longer apply.

Use the plan's `mode` to select the route below. Missing planning inputs can be repaired through
`scrapider-write-plan`; direct work uses the ordinary workflow.

## Dispatch implementation

### Single plan

Give each implementer the checkout, `PLAN.md` and assigned step IDs, including the write scope and
available inputs for partial assignments.

### Modular plan

Use the total `PLAN.md` for routine coordination. Send implementers their assigned Brief paths,
checkout, verified inputs and coordination constraints. They read the Briefs and their required links.
Open a relevant Brief section when a discrepancy needs resolution.

Release work against its recorded prerequisites. An agreed contract and an implemented upstream
output are distinct inputs. Confirm required outputs in the consuming checkout, order conflicting
writes, and identify ready steps for partial assignments. A grouped assignment starts when its
external prerequisites are met; the assignee verifies internal outputs before consuming them.

## Implement, verify and integrate

The assigned steps and file actions define the implementation scope. Implementers verify acceptance
under project rules and return completed steps, check results and evidence, remaining coverage and
material deviations with reasons. Include scenario references where applicable. Required work outside
those representative paths still needs verification.

Evidence identifies the code/configuration version or artifact checked, including relevant uncommitted
changes, procedure and observed results. It must support the claimed boundary; a component check cannot
stand in for a connection it bypasses.
Implementation and integration own these checks before review. Reuse applicable results and rerun
affected checks after changes. Record unavailable required verification as an acceptance gap.

When required planning inputs remain unavailable or checkout evidence invalidates the planned scope,
ownership, behavior, contracts, dependencies or acceptance, implementers return the gap and affected steps.
Hold that work while arranging the necessary revision through `scrapider-write-plan`; independent
work can continue. The agent revising the plan maintains the affected Briefs/contracts and review
inputs as well as the total Plan. The primary agent verifies the coordination changes before release.

**Keep the total Plan synchronized.** Any Brief change affecting delivery, connections, prerequisites
or acceptance must be reflected there in the same revision. Keep each material adjustment and reason
beside the affected decision or step; other views link it. Routine implementation choices within the
agreed scope need no change record. Do not rewrite acceptance to match an unintended implementation.

At dispatch and on each return or block, update the single Plan's steps or modular index with state
(pending, in progress, blocked or done), assignee, checkout/output reference, check evidence and remaining
work or release conditions. Reuse common references; do not maintain a parallel progress log. Mark a
step or Brief done only when its promised output is usable and its assigned checks have passed on that
output, with evidence. Integration and review remain separate completion gates.

Assign responsibility for integrating outputs into the consuming/integration checkout and resolving
shared writes. Confirm the integrated outputs before releasing consumers. Run the combined-output
checks, route defects to their owners and collect the resulting evidence and remaining gaps.

## Dispatch and collect review

After integration, the primary agent reads `REVIEW.md` for modular plans and single plans with a
review handoff, then prepares the scoped assignments. Modular plans use both roles below; single
plans use the reviews specified by their handoff and applicable project rules.

Supply the actual checkout and comparison baseline, relevant Plan sections and Briefs/steps, requirements and contracts,
accepted plan adjustments, and verification results or gaps. Include the full task-related diff,
including relevant staged, unstaged and untracked changes. File inventories are review references,
not a filter that excludes unplanned task-related changes.

- **Functional review:** [scrapider-code-reviewer](../../agents/scrapider-code-reviewer.md) checks the
  implementation against requirements, contracts, planned file actions and acceptance. Include
  coverage outside sampled scenarios, unexplained plan/implementation differences and affected
  Brief/total-Plan consistency.
- **Standards review:** [scrapider-standards-reviewer](../../agents/scrapider-standards-reviewer.md) checks
  the same scope against applicable rules. Supply project instruction paths and the exact
  [Scrapider Guidelines directory](../scrapider-guidelines/SKILL.md); follow its
  [standards review procedure](../scrapider-guidelines/references/shared/standards-review.md).

Use the callable role or assign its bundled definition to a native subagent. `REVIEW.md` remains the
coordinator's dispatch guide; reviewers receive scoped inputs and return findings directly in their
existing formats. A review can proceed with explicit verification gaps when its necessary inputs
are available. Report unavailable roles or necessary review inputs as blockers.

In the Plan's existing Review entry, identify each returned finding and record its disposition:
fixed with fix/recheck evidence; dismissed with supporting reasons/evidence; or open/deferred with
reason, impact, owner and next action. Reference the original finding where durable, otherwise retain
enough detail to identify it.
Assign fixes; the primary agent confirms fix/recheck evidence and requests focused reviewer follow-up
for material questions that evidence cannot settle. A disposition does not waive required acceptance.

Accept completion when implementation, required verification and applicable reviews support the full
planned scope. In delivery, summarize material accepted adjustments, remaining blockers, unverified
outcomes and open/deferred findings with their impact; link the records rather than repeating them.
