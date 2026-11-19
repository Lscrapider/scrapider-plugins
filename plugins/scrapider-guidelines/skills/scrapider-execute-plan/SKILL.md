---
name: scrapider-execute-plan
description: Requires an enabled, authorized subagent mode. Use to execute or resume a Scrapider plan, coordinating implementation, verification, and review through subagents. Discover plans under .scrapider/plan or use a supplied plan path.
---

# Execute a Scrapider Plan

The primary agent coordinates implementation, integration and review through the host's native
subagents. The caller sets concurrency and, for single plans, decides how to group steps.

## Resolve the plan

Read applicable project instructions and the supplied `PLAN.md`. Otherwise locate the plan under
`.scrapider/plan/YYYY-MM-DD-<feature-name>/` from the task; resolve ambiguous matches before dispatch.
Confirm the checkout and scope. At execution start, record the checkout and starting workspace baseline
in the Plan, including pre-existing edits. On resumption, use its progress/evidence records to verify
outputs in the consuming checkout and that checks still apply. Resume unfinished work whose prerequisites
are met; reopen only affected work when outputs or evidence no longer apply.

Use the plan's `mode` to select the route below. An existing step or Brief with a usable result and
applicable acceptance can serve as its delivery entry. Use `scrapider-write-plan` to resolve missing
planning inputs. Direct work uses the ordinary workflow.

## Dispatch implementation

Dispatch work against its recorded prerequisites. An agreed contract may support parallel work.
Confirm any required implemented outputs in the consuming checkout. When several assignments contribute
to one delivery, coordinate dependent work and conflicting writes. Apply shared checks to the combined
edits they require.

### Single plan

Give each implementer the checkout, `PLAN.md` and assigned step IDs, including the write scope and
available inputs for partial assignments.

### Modular plan

The primary agent dispatches one implementation subagent per ready implementation document from the
total `PLAN.md` allocations. A Brief normally contains one document. Give the subagent its document,
the Brief's allocation link, checkout, required contracts, available inputs and predecessor results.
The subagent carries out all steps and local checks in that document.

Run ready documents from different Briefs in parallel within available capacity and the caller's
concurrency limit. Within each Brief, run numbered documents serially, with one active implementer at
a time. After confirming the current document's output and assigned verification in the consuming
checkout, dispatch a fresh subagent for the next document. Pass the relevant output reference,
evidence and remaining conditions through the Plan's progress record. If a document is blocked,
continue ready work in other Briefs.

The allocation defines the change scope and output. An existing single-file Brief serves as one
implementation document. Existing plans can link already defined scope into the total Plan. Resolve
conflicting claims there before dispatching affected work. If the workload requires a different split,
revise the allocation and affected documents through `scrapider-write-plan` before dispatching the
revised assignments.

Reuse a document's assigned implementer when resuming that document or routing its fixes. If that
implementer is unavailable, confirm its writes have stopped, verify progress and assign the document's
remaining work to one replacement. Coordinate fixes with any later work in the same Brief to preserve
serial writes, and recheck affected downstream results before continuing.

## Implement, verify and integrate

Implement within the single plan's assigned steps or the assigned modular document and its Brief's
allocation.
Implementers perform their assigned checks under project rules and return completed steps, results
and evidence, remaining coverage and material deviations with reasons. Include scenario references
where applicable.
Required work outside those representative paths still needs verification.

Evidence identifies the code/configuration version or artifact checked, including relevant uncommitted
changes, procedure and observed results. It must support the claimed boundary; a component check cannot
stand in for a connection it bypasses.
Implementation and integration own these checks before review. Reuse applicable results and rerun
affected checks after changes. Record unavailable required verification as an acceptance gap.

Report unavailable inputs and the work they affect. When requirements or checkout evidence invalidate
a planned delivery, resolve the affected scope, ordering or acceptance through `scrapider-write-plan`.
For example, if making an output usable requires changes assigned to a consumer waiting on that output,
revise the delivery boundary. Independent work can continue. The agent revising the plan maintains
the affected Briefs/contracts, review inputs and total Plan. The primary agent confirms the revised
prerequisites before dispatching affected work.

**Maintain the allocation.** Work outside the allocation or changes to a Brief's scope, shared contract,
dependencies or output go to the coordinator. Revise the total-Plan allocation and affected Briefs in
the same revision before dispatching the changed work. Keep the reason beside the owning decision or
assignment and link it from other views. Local implementation choices remain with the implementer.
Acceptance continues to follow the requested behavior.

At dispatch and on each return or block, update the single Plan's steps or the assigned document's
progress under its Brief in the modular Plan with state, assignee, checkout/output reference, check
evidence and remaining work. Record completed contributions there. Mark the delivery available once
the edits needed for its promised output are present in the consuming checkout and its assigned
evidence supports that output. Final acceptance still depends on the applicable integration and review
results.

Assign responsibility for integrating outputs into the consuming/integration checkout and resolving
shared writes. Confirm the integrated outputs before releasing consumers. Run the combined-output
checks, route defects to their owners and collect the resulting evidence and remaining gaps.

## Dispatch and collect review

After integration, the primary agent reads `REVIEW.md` for modular plans and single plans with a
review handoff, then prepares the scoped assignments. Modular plans use both roles below; single
plans use the reviews specified by their handoff and applicable project rules.

Supply the actual checkout and comparison baseline, relevant Plan sections, Brief allocations and
implementation documents or single-plan steps, requirements and contracts, accepted plan adjustments,
and verification results or gaps. Include the full task-related diff,
including relevant staged, unstaged and untracked changes. File inventories are review references,
not a filter that excludes unplanned task-related changes.

- **Functional review:** [scrapider-code-reviewer](../../agents/scrapider-code-reviewer.md) checks the
  implementation against requirements, contracts, planned file actions and acceptance. Include
  coverage outside sampled scenarios, unexplained plan/implementation differences and affected
  consistency between implementation documents, Brief allocations and the total Plan.
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
