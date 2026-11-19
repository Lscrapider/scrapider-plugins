# Review Plan

Create `REVIEW.md` beside the plan when review applies. It guides the primary agent's dispatch after
integration. Modular plans use both roles; single plans use the roles required by the request and
project rules. Write task-specific scope, evidence and questions here; role procedures are supplied
by `scrapider-execute-plan` and the bundled reviewer definitions.

```markdown
# <Change name> review plan

## Scope and inputs

- **Scope** <Integrated change, checkout and comparison baseline; include all task-related changes.>
- **Plan references** <Brief allocations and implementation documents or single-plan steps, file actions,
  requirements, contracts and acceptance.
  Link accepted adjustments and reasons at their owning decision/step; use the Plan's starting baseline
  to distinguish pre-existing edits.>
- **Evidence** <Implementation/integration checks, code/configuration tested, results and gaps.
  Include migration comparisons and cross-module path evidence where applicable.>

## Functional review

**Role** `scrapider-code-reviewer`

<Task-specific behaviors, preserved contracts, connections and potential plan deviations to inspect.
Consider the full requirements as well as the representative scenarios; reference the relevant evidence.>

## Standards review

**Role** `scrapider-standards-reviewer`

<Applicable project instructions and Scrapider Guidelines path, plus change-specific rule concerns.>
```

Reviewers return findings directly. Implementation and integration retain responsibility for required
verification and fixes; review evidence does not replace missing acceptance checks.
The primary agent records finding dispositions in the Plan's Review entry; this file remains the
dispatch guide, not a second record of findings or progress.
