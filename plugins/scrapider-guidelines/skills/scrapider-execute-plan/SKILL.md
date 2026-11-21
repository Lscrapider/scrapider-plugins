---
name: scrapider-execute-plan
description: Requires an enabled, authorized subagent mode. Use to execute or resume a confirmed Scrapider plan with implementation subagents and applicable final reviews. Discover plans under .scrapider/plan or use a supplied plan path.
---

# Execute a Scrapider Plan

**The confirmed plan and its companion documents are frozen, read-only inputs to every
assignment. This boundary takes precedence over any step that asks to update them.**
Only the primary agent may correct an implementation instruction that project facts prove
wrong. The implementer sends the step, conflicting fact and proposed correction directly to the
primary agent and continues unaffected work. Within the agreed scope, contracts and acceptance
criteria, the primary agent verifies the correction, replaces only the incorrect instruction in
its original step and sends the confirmed approach back to the original implementer to carry out.
Keep the discussion and follow-up with affected implementers in the host conversation. If a
correction would change the scope, contracts or acceptance criteria, take the decision to the user.

**Deliver all planned functionality before final review.** The primary agent dispatches from
`PLAN.md`. One implementation subagent owns each whole Brief through delivery. Keep ready work
moving whenever another assignment is blocked.

## Dispatch and resume

Read the applicable project instructions and the supplied `PLAN.md`, or identify the requested
plan under `.scrapider/plan/YYYY-MM-DD-<feature-name>/`. Resolve an ambiguous match before
dispatch. Confirm the consuming checkout, the comparison baseline and any pre-existing edits
so the task's changes can be identified later. Use the plan's `mode` to assign work. Direct
work uses the project's ordinary workflow.

- **Modular plan.** Use the total plan's allocations to identify ready Briefs. Consult the Briefs
  as needed for a dispatch decision, such as checking whether proposed edits overlap. Give the
  implementer its Brief ID, published path and checkout. Add context it cannot get from the
  Brief and its links, such as pre-existing edits to preserve, the scope of a user authorization,
  or an upstream result now available. Point to the relevant section for instructions already
  in the Brief. The implementer reads the whole assignment at that path and completes all its
  steps and local checks. Dispatch ready Briefs in parallel within the caller's concurrency
  limit and order conflicting writes. An agreed interface may be enough to start. If the plan
  calls for an implemented dependency, confirm the output in the consuming checkout.
- **Single plan.** Follow the caller's grouping of step IDs and concurrency limit. Give each
  implementer `PLAN.md`, its assigned IDs, the checkout and available inputs.

On resume, match the plan's IDs to prior delivery replies and the optional progress view. Resolve
uncertain results against the consuming checkout, then resume ready work with its original
implementer. If a replacement is necessary, establish that the previous implementer has stopped
writing and pass the same assignment with its remaining scope. When moving to a new conversation,
pass the plan path, active IDs, blockers and applicable authorization limits in a short message.

## Implement and integrate

Implementers work through the full assignment. If a prerequisite is missing, continue the steps
that can proceed and report which remaining work depends on it. Make local implementation choices
within the agreed scope and run the necessary checks under project instructions and user
authorization. Reuse existing checks that exercise the changed behavior and rerun affected
checks after a fix.

Return the ID, the functionality delivered and the check results directly to the primary agent
in the host conversation. If work remains, name the missing functionality, the exact prerequisite
or decision needed, and what can still proceed. On integration, check the delivered result
against the ID's criteria in the consuming checkout and run the checks that need combined
outputs. Follow up with the owner on a specific gap. Lead progress updates with functionality
delivered, functionality still owed and any real blocker.

### Optional progress view

Direct replies suffice for ordinary runs. When a complex plan or cross-session recovery needs a
progress view, reuse the host's task list if implementers can update their entries, or use one
shared table outside the plan documents with row edits that preserve other implementers' updates.
Use just **ID** and **Status**. Key each row
by Brief ID, or by assigned step ID in a single plan. On a new run, an unclaimed ID is
`Not started`. Only its assigned implementer adds or updates that row as its state changes to
`In progress`, `Blocked` or `Done`. Mark it `Done` when its completion criteria are met.
The view is read-only for the primary agent. Specific remaining work and check results belong
in the implementer's reply.

## Final review and acceptance

Start final review only when **every Brief** (or every step of a single plan) has delivered its
planned implementation and the outputs are integrated. Account for the full list of IDs in
`PLAN.md` against the actual deliveries. Return unfinished functionality to its implementer and
continue other ready work.

At that point, read the sibling `REVIEW.md` for a modular plan or a single plan with a review
assignment. Send its shared scope and role-specific instructions directly to the reviewers.
Supply the actual checkout, comparison baseline and relevant check results or gaps from the
conversation. The reviewers inspect the full task-related change, including relevant staged,
unstaged and untracked files.

- [Functional reviewer](../../agents/scrapider-code-reviewer.md) checks the delivered behavior
  against the requirements, contracts and acceptance criteria across the assigned scope.
- Give the [standards reviewer](../../agents/scrapider-standards-reviewer.md) the applicable
  project instruction paths and the directory containing the loaded
  [Scrapider Guidelines](../scrapider-guidelines/SKILL.md) so it follows that copy's
  [standards review procedure](../scrapider-guidelines/references/shared/standards-review.md).

Modular plans use both roles. Single plans use the roles required by the request and project
rules. Use the callable role or give its bundled definition to a native subagent. Reviewers
return findings directly to the primary agent. Report an unavailable required review as a blocker.

Route delivery-blocking findings to the original implementer. Confirm the affected fix and
request a focused reviewer follow-up only when a material question remains. Report non-blocking
findings in the delivery reply. Claim completion when the full requested scope, required
verification and applicable reviews meet the agreed acceptance criteria. State any outstanding
functionality or unverified behavior explicitly.
