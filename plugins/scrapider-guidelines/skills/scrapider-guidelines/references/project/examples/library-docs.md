# Library Documentation Scenarios

Read the scenario matching the selected documentation service after capability selection. Apply the
[description rules](../agents-md-authoring.md#capability-entry-format) and project constraints. Local
source, build metadata, and dependency artifacts remain the evidence for the project's current state;
external documentation supplies versioned upstream facts.

## Context7

```md
- **Context7** — External library versions, compatibility, and API facts.
  - **Scenario**:
    - For a new dependency, fork, renamed library, or version upgrade, verify the current stable release and compatibility with the project's framework line.
    - For a version-sensitive API fact, query only after repository examples and local dependency artifacts cannot answer it.
  - **Boundary**:
    - Match the documentation to the target library coordinates; reject a different-library result.
    - Local dependency artifacts establish installed signatures; declared project versions take precedence over external examples.
    - Verify language-level correctness by compilation; documentation does not replace this check.
  - **Skip**: Do not query for routine implementation already demonstrated by the repository.
  - **Fallback**: Consult official library documentation when the service is unavailable or lacks matching evidence; state unresolved facts.
```

## Codegraph and Context7

```md
- **Codegraph** — Code relationships and impact evidence.
  - **Scenario**: Unresolved cross-file call, dependency, or impact questions covered by the project index.
  - **Boundary**: Codegraph supplies relationship evidence only.

- **Context7** — External library versions, compatibility, and API facts.
  - **Scenario**:
    - For a new dependency, fork, renamed library, or version upgrade, verify the current stable release and compatibility with the project's framework line.
    - For a version-sensitive API fact, query only after repository examples and local dependency artifacts cannot answer it.
  - **Boundary**:
    - Match the documentation to the target library coordinates; reject a different-library result.
    - Local dependency artifacts establish installed signatures; declared project versions take precedence over external examples.
    - Verify language-level correctness by compilation; documentation does not replace this check.
  - **Skip**: Do not query for routine implementation already demonstrated by the repository.
  - **Fallback**: Consult official library documentation when the service is unavailable or lacks matching evidence; state unresolved facts.
```
