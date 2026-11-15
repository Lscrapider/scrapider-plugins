# Planning and Collaboration Examples

Use these examples only for planning workflows or collaboration roles the author selects for
`AGENTS.md`. They describe routing and handoffs; they do not install or register a framework or role,
guarantee host availability, or authorize execution. User instructions and applicable model, host, and project
policies govern each selection.

## Planning

When a change uses a planning workflow, select one authoritative task plan and give each formal
specification one owner. Add another capability for a distinct responsibility, such as requirements
or investigation notes. Define what it hands off to the selected plan.

### Scrapider planning and execution

Select the pair for durable handoffs to implementation subagents. Use the ordinary workflow for
clear local changes that can be delivered directly. Both skills use the same plan when the pair applies.
See [plan writing](../../../../scrapider-write-plan/SKILL.md) and
[plan execution](../../../../scrapider-execute-plan/SKILL.md) for the artifact and handoff rules.

When OpenSpec or another selected framework owns the implementation task list, follow that list
for execution. The Scrapider pair can use an existing specification as requirements when the
author assigns ownership of the implementation task list to `PLAN.md`.

- **`scrapider-write-plan`** — Prepare or revise a plan for implementation subagents.
  - **Scenario** Use it when a change needs a durable handoff and the session supports and authorizes
    subagent delegation.
  - **Boundary** It prepares the `PLAN.md` that drives execution, adds implementation Briefs for
    modular plans, and writes `REVIEW.md` when the plan requires a review handoff.

- **`scrapider-execute-plan`** — Execute or resume a Scrapider plan.
  - **Scenario** Use it when an adopted Scrapider plan is ready to run or resume in a session that
    supports and authorizes subagent delegation.
  - **Boundary** It coordinates implementation, verification, integration, and review from the
    same plan. For modular plans, the primary agent uses `REVIEW.md` to dispatch both functional
    and standards review.

### Cross-session evidence with one task plan

- **Planning with Files** — Preserve investigation records across sessions.
  - **Scenario:** Findings, decisions, open questions, or progress must
    survive context changes.
  - **Boundary:** It owns durable evidence and session progress. Keep the single canonical task
    list with the selected plan owner; do not duplicate it in these notes.

### Formal change specification

- **OpenSpec** — Maintain a traceable change specification, implementation task list, and decisions.
  - **Scenario:** The project requires reviewable requirements, implementation tasks, and formal
    decisions, and the author selected OpenSpec.
  - **Boundary:** OpenSpec owns the canonical specification, task list, and formal decisions.
    Implementation follows those artifacts without creating a competing plan or changing their
    authority.
  - **Fallback:** Preserve existing specifications if OpenSpec is unavailable; confirm a different
    specification owner only when continuing requires replacement.

### Formal change plus separate cross-session evidence

- **OpenSpec** — Own the formal change record.
  - **Scenario:** A formal OpenSpec change is required and substantial investigation or session notes
    must persist beyond the specification.
  - **Boundary:** OpenSpec owns requirements, the task list, and formal decisions; it remains
    the only specification and task-plan owner.

- **Planning with Files** — Record evidence and progress outside the formal change specification.
  - **Scenario:** The cross-session notes are independently useful and are not already covered by
    OpenSpec.
  - **Boundary:** It owns investigation evidence and session progress only; it does not create
    duplicate requirements, decisions, or implementation tasks.

### Explicitly selected Superpowers plan-to-execution workflow

- **Superpowers `writing-plans`** — Produce the plan in an explicitly selected Superpowers pair.
  - **Scenario:** The author selected the pair, the host exposes both skills, and user, model, host, and
    project policies permit their use.
  - **Boundary:** `writing-plans` produces the one authoritative plan consumed by
    `executing-plans`; no other framework owns a competing specification or task list.

- **Superpowers `executing-plans`** — Execute against the pair's selected plan.
  - **Scenario:** The project selected the pair and work is ready to proceed against its
    authoritative plan.
  - **Boundary:** `executing-plans` follows the same plan owned by `writing-plans`. Add
    another planning capability only for a distinct responsibility while retaining that one
    authoritative task record.

### Project-required full specification-led workflow

- **GitHub Spec Kit** — Maintain a linked specification, implementation plan, and decision record.
  - **Scenario:** The project explicitly requires this full lifecycle as its canonical workflow.
  - **Boundary:** GitHub Spec Kit owns the formal specification and task plan. Implementation
    follows those artifacts; another framework must not own a competing specification or task list.
  - **Fallback:** Preserve existing artifacts if the selected components are unavailable; confirm a
    different specification owner only when continuing requires replacement.

## Collaboration

Use this example only after the author enables collaboration, or when rebuilding an existing
collaboration policy. Include only selected roles and resolve their callable names for the target
host; use a plugin namespace when the host requires it. Bundled roles are not an instruction to
enable collaboration or run every role.

Delegate responsibilities that can be separated and handed off clearly. The primary agent owns task
scope, decisions, integration, and final acceptance. Each role returns findings or results to the
primary agent within the delegation boundaries of its definition.

### Role responsibilities

| Responsibility | Role type | Expected delivery |
| --- | --- | --- |
| Code investigation | `scrapider-explorer` | Read-only evidence, key locations, and unresolved questions. |
| Technical proposal assessment | `scrapider-solution-expert` | Overall assessment, key issues, risks, and open verification items. |
| Code implementation | `scrapider-developer` | Bounded changes, verification results, and material remaining risks. |
| Work outside specialist roles | `scrapider-generalist` | The assigned result without duplicating a specialist's scope. |
| Engineering standards review | `scrapider-standards-reviewer` | Read-only, evidence-backed violations of applicable engineering rules. |
| Functional and logic review | `scrapider-code-reviewer` | Read-only findings about requirements, incorrect behavior, and regressions. |

### Handoffs

The primary agent assigns bounded work, passes relevant evidence between roles, and verifies the
returned results before acceptance. Standards-review triggers and dispatch stay with the selected
skill's built-in rules. Add functional review or a combined review policy only when the project or
author selected it; keep the two reviewers' responsibilities distinct.
