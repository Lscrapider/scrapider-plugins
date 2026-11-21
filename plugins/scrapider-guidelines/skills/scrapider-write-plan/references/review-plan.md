# Review Assignments

Prepare `REVIEW.md` beside the plan. Include both role assignments for a modular plan and the
applicable assignments for a single plan. Write the shared scope and each role's questions so
they can be sent directly to the reviewer. Dispatch is covered by
[plan execution](../../scrapider-execute-plan/SKILL.md).

```markdown
# <Change name> review

## Shared scope

<Describe the requested outcome and the affected modules and interfaces. Link the authoritative
requirements, contracts and acceptance criteria that the reviewers need.>

## Functional review

**Role** `scrapider-code-reviewer`

<Which end-to-end behavior must work, which existing behavior must be preserved, and where an
integration failure would be visible. Include relevant failure or migration cases.>

## Standards review

**Role** `scrapider-standards-reviewer`

<Link the applicable project instructions and identify the boundaries or engineering rules
relevant to this change.>
```
