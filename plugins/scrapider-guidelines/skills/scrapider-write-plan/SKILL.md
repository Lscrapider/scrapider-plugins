---
name: scrapider-write-plan
description: Requires an enabled, authorized subagent mode. Use to prepare or refine a draft Scrapider plan when a coding change needs a durable handoff to implementation subagents.
---

# Write a Scrapider Execution Plan

Write `PLAN.md` so the primary agent can dispatch the full scope from it. **Settle interfaces
between assignments before presenting the plan for confirmation.** In a modular plan, choose
Brief boundaries so implementers can work in parallel using available inputs or agreed interfaces.
Give each module one Brief with all the steps its implementer needs to deliver it.

**The confirmed plan and its companion documents are read-only inputs except when the primary
agent corrects a step or implementation detail that project facts prove wrong.** Within the
agreed scope, contracts and acceptance criteria, the primary agent replaces only the incorrect
part in place with the correct wording.
[Plan execution](../scrapider-execute-plan/SKILL.md) governs that correction, dispatch and review.

## Derive the change from behavior

Start from the request, applicable project instructions and relevant source evidence. Identify the
requested outcomes, material behavior to preserve and constraints that shape the design. Link the
applicable parts of existing specifications. Inspect the actual entry points, affected callers, module
dependencies and existing checks where they determine the result or constrain the approach.

Before defining assignments, follow representative inputs from the actual entry point through
the operation that decides the result and its downstream effects. Plan the necessary edits
together, accounting for existing data and changes other callers can make before or during the
operation. Choose an approach that fits the caller and module boundaries and the request's constraints.

Trace intended success and the material refusals the behavior requires. Use the actual input shape and
satisfy unrelated prerequisites so a refusal reaches the decisive guard. Identify the observable
rejection and the effects that the guard prevents. A sampled new capability should have a case that
distinguishes it from the previous behavior. Use the same inputs and expected observations when
defining the checks that exercise these paths. Account for other required outcomes, including
failure, recovery or compatibility cases, in the assignments and acceptance criteria.

For each shared interface, identify the producer and its consumers. Link both sides to the
existing type or schema that defines it, or define it once in the plan. For a direct call
across assignments, give the callable name, parameter names and types, and return type.
For APIs and messages, specify the names, types and nesting of the fields exchanged on the
wire. This definition governs both implementations. Each module chooses its internal
representation. Include relevant units, transformations and error behavior. For persisted
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
handoff. Put changes that must land together in the same delivery, even when they have separate
file owners or Briefs. Each delivery must support the consumers active at that point in the
intended checkout or rollout. Place the combined check after the edits it depends on.

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
- Give each assignment the checks that establish its own delivery. Define each check of joint
  behavior once in the plan's integration or acceptance section, with the participating
  outputs, required environment and expected result. Contributing assignments link to it.
  Reuse existing checks that exercise the behavior and follow project rules and user
  authorization for verification.
- Give reviewers the scope, requirements and questions specific to this change in `REVIEW.md` when
  applicable. Link shared definitions and the relevant acceptance criteria at their source.

## Finish the handoff

Before confirmation, follow each shared interface through the implementation steps on both
sides. Match the arguments the caller will pass to the signature the provider will implement.
For APIs and messages, trace each field from the value the producer can supply at send time
to its location in the shared payload and its use by the consumer. Establish the wire type,
whether the field is required and when the receiver applies its value. Verify these details
against the existing sending and receiving code where available. Resolve missing inputs and
conflicting uses in the draft so both sides can implement from the same definition. If an
interface depends on a business decision from the user, obtain it before finalizing it.

Check that the assignments cover every requested outcome and that their dependencies and
completion criteria are usable. Identify any missing prerequisite for the affected assignment.

When the draft's complexity or uncertainty warrants independent assessment, use the
[`scrapider-solution-expert`](../../agents/scrapider-solution-expert.md) subagent. Resolve confirmed
gaps in the draft and return the plan path and any outstanding decisions.

### Prompt for a fresh execution conversation

When the plan is ready for confirmation, include one copy-ready execution prompt in the same
reply. Put the prompt in its own code block, in the user's language, for use after confirmation.
Address the new primary agent directly and use the actual plan and conversation.

1. **Identify the work.** Name the intended outcome, the actual checkout and the exact path to
   the frozen `PLAN.md`. Use the receiving host's invocation for `scrapider-execute-plan`
   when known (such as `$scrapider-execute-plan` in Codex). Otherwise name the skill and its
   `scrapider-guidelines` plugin in words.
2. **Route assignments according to the plan's mode.** The primary agent reads the
   project-wide instructions and uses the allocations and dependencies in `PLAN.md`. In modular
   mode, direct it to send each ready Brief's ID and path to one implementer for the whole
   assignment. The implementer reads the Brief and applicable module guides. The primary agent
   consults a Brief when a particular dispatch decision needs it. In single mode, direct the
   primary agent to assign the plan's step IDs using any grouping the caller supplied.
3. **Choose what to carry over.** Refer to a section of the project or plan only when it helps
   the recipient start. Carry over a fact from the planning conversation only if it changes
   execution and the new session cannot recover it from those sources. Preserve the scope of
   the user's permissions and limits and identify any user edits that need protection.
4. **Specify the delivery.** Include combined checks when the plan defines them, at their
   planned integration point. Include final review when required, after the full implementation
   is integrated. Ask for a direct reply with delivered and outstanding functionality, actual
   check and review results, and checks still awaiting a test environment. The user makes
   the final business acceptance decision.

Example handoff for a modular order-import plan

```text
In /work/shop, use scrapider-guidelines:scrapider-execute-plan to implement order import.
The confirmed plan is .scrapider/plan/2026-05-01-order-import/PLAN.md.

Read the project-wide instructions and dispatch from the frozen plan. Send each ready Brief
by ID and path to one implementer, who reads that Brief and its module guides, completes it
and replies to you with the result.

Run the integration checks whose prerequisites are available. Once all Briefs are delivered
and integrated, use REVIEW.md for final review. Reply here with what was delivered, what
remains, the actual results and any checks deferred to the test environment. I will handle
business acceptance.
```
