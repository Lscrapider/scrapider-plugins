# Scrapider Guidelines

<p align="center">
  <img src="plugins/scrapider-guidelines/assets/icon.png" width="128" height="128" alt="Scrapider Guidelines plugin icon" />
</p>

[简体中文](README_zh-CN.md) | English

Engineering guidelines and multi-agent planning workflows for coding agents working in Scrapider projects. The skills help agents follow project architecture, preserve business contracts within the requested scope, and deliver verified changes with appropriate complexity.

## What it provides

- A coding workflow for understanding the problem, implementing or debugging, verifying behavior, and reporting evidence.
- Shared rules for scope, business contracts, reuse, responsibility boundaries, and refactoring.
- Validation and exception rules based on actual callers, existing guarantees, and required business behavior.
- Scope-specific guidance for Spring Boot, Python, Android Kotlin, and Jetpack Compose work.
- Conditional standards review and separate Git operation guidance.
- On-demand authoring of the target `AGENTS.md`, with optional MCP, skill, plugin, and collaboration recommendations.

## Supported scopes

| Scope | Guidance |
| --- | --- |
| Spring Boot backend | Package responsibilities, layered architecture, and object placement. |
| Multi-module Maven projects | Module ownership, dependencies, and Spring configuration placement. |
| Python | Package and module organization. |
| Android Kotlin & Jetpack Compose | UI state, data mapping, error handling, and Compose architecture. |
| Android UI implementation | Additional guidance for design-driven UI and product UI work. |
| Standards review | A read-only conformance-review workflow with local mechanical checks. |
| Project AGENTS.md | Help authors select clear, structured project instructions and refresh existing sections with relevant capability combinations and collaboration guidance. |

## Usage

Use your coding agent's skill installation and invocation mechanisms. The instructions and references target coding agents generally; discovery, invocation, and available capabilities depend on the host. This repository also works as a plugin marketplace: in ZCode or Claude Code, add `https://github.com/Lscrapider/scrapider-plugins` as a plugin marketplace and install the `scrapider-guidelines` plugin to get its skills and six role agents. The optional `scrapider-capabilities` plugin registers the recommended MCP servers (Context7 docs lookup, Codegraph code intelligence) for hosts that do not already have them. These examples use Codex invocation syntax:

```text
Use $scrapider-guidelines to implement this Spring Boot change.
```

The skill can also be selected automatically when an agent is asked to write, edit, refactor, debug, or review code under Scrapider engineering rules.

Examples:

```text
Use $scrapider-guidelines to review this Python diff.

Use $scrapider-guidelines to refactor this Jetpack Compose screen without changing its public behavior.

Use $scrapider-guidelines to implement this Spring Boot endpoint and preserve the existing API contract.

Use $scrapider-guidelines to create, update, or rebuild this project's AGENTS.md with suitable workflows and optional tool combinations.
```

In Claude Code, run the explicit standards review command with its plugin namespace:

```text
/scrapider-guidelines:scrapider-review
```

Add a scope or paths after the command to narrow the review. Without arguments, it reviews the current working-tree changes.

AGENTS.md authoring writes only the requested instruction file. It preserves project conventions and does not install tools or create configuration or separate agent-definition files.

### Multi-agent execution plans

- [**Write a plan**](plugins/scrapider-guidelines/skills/scrapider-write-plan/SKILL.md) with `$scrapider-write-plan`. Clear local changes use the ordinary workflow. For a durable handoff, write a single `PLAN.md` or a modular `PLAN.md` with implementation Briefs under `.scrapider/plan/YYYY-MM-DD-<feature-name>/` at the project root.
- [**Execute a plan**](plugins/scrapider-guidelines/skills/scrapider-execute-plan/SKILL.md) with `$scrapider-execute-plan` and the plan path. The caller controls executor count and grouping. For modular work, the primary agent coordinates from `PLAN.md`, hands Brief paths to implementers, and reads the sibling `REVIEW.md` to dispatch the functional and standards reviews after integration. Reviewers return results directly.

Both skills require a session where subagent delegation is available and permitted for the task. Select them only in such a session.

## How reference routing works

The main [SKILL.md](plugins/scrapider-guidelines/skills/scrapider-guidelines/SKILL.md) defines the working principles, coding workflow, and loading rules. Detailed guidance is grouped by the decisions it governs:

| Category | Source |
| --- | --- |
| Change scope, business contracts, reuse, responsibilities, and refactoring | [Code Design and Changes](plugins/scrapider-guidelines/skills/scrapider-guidelines/references/shared/code-design-and-changes.md), loaded for all code and build/runtime configuration work. |
| Input guarantees, validation ownership, and exception handling | [Validation and Boundaries](plugins/scrapider-guidelines/skills/scrapider-guidelines/references/shared/validation-and-boundaries.md), loaded when those decisions are in scope. |
| Review applicability, dispatch, read-only procedure, and report | [Standards Review](plugins/scrapider-guidelines/skills/scrapider-guidelines/references/shared/standards-review.md), loaded for explicit reviews or changes that may cross its review boundaries. |
| Git authorization and commit message format | [Git Operations and Commits](plugins/scrapider-guidelines/skills/scrapider-guidelines/references/shared/git-commits.md), loaded before any Git state mutation. |
| Inspection script library | [Inspection Scripts](plugins/scrapider-guidelines/skills/scrapider-guidelines/references/shared/inspection-scripts.md), loaded for scripted Java review and inspection-library maintenance. |
| Project instructions and optional capability combinations | [AGENTS.md Authoring](plugins/scrapider-guidelines/skills/scrapider-guidelines/references/project/agents-md-authoring.md), the entry point for authoring requests; it routes to recommendations, selected examples, role definitions, and separately requested setup. |
| Technology-specific responsibilities | Start with the applicable [Spring Boot](plugins/scrapider-guidelines/skills/scrapider-guidelines/references/java/spring-boot-backend.md), [Python](plugins/scrapider-guidelines/skills/scrapider-guidelines/references/python/python-code-organization.md), or [Android](plugins/scrapider-guidelines/skills/scrapider-guidelines/references/android/android-kotlin-compose.md) baseline, then follow its matching scenario routes. |

Each entry point owns the triggers for its downstream references; loading it does not load every
linked file. A Spring Boot task follows the backend baseline's routes for multi-module placement,
architecture, HTTP/domain objects, data access, and messaging only where applicable. Python tasks
follow the Python baseline's package-layout route when creating, moving, or reorganizing code.
Android tasks follow the Android baseline's separate routes for implementation from a design and
product UI design without a fixed image. Mixed tasks load every applicable route, including behavior
affected through callers, and revisit routing when the scope expands. Implementation and review use
the same routes. Reference examples do not require adding layers the project does not need.

The shared code-design rules distinguish the reported location from the cause's actual scope:
inspect related paths when evidence connects them, repair shared causes within the authorized scope,
and keep scenario-specific behavior local. Determine that scope before introducing an abstraction.

For a standards-conformance review, follow [`references/shared/standards-review.md`](plugins/scrapider-guidelines/skills/scrapider-guidelines/references/shared/standards-review.md), which defines when to delegate to the read-only `scrapider-standards-reviewer` agent or review directly.

## Working principles and origin

The [working principles](plugins/scrapider-guidelines/skills/scrapider-guidelines/SKILL.md#working-principles) retain the emphasis on reasoning before coding, simplicity, focused changes, and verifiable outcomes. Their framing follows the community-maintained [Karpathy-inspired coding guidelines](https://github.com/multica-ai/andrej-karpathy-skills), which derive from Andrej Karpathy's observations about coding agents.

The [coding workflow](plugins/scrapider-guidelines/skills/scrapider-guidelines/SKILL.md#coding-workflow) applies these principles alongside the project's architecture, business contracts, validation boundaries, verification, and review requirements. Load detailed guidance for the actual task and maintain each rule in its relevant category.

## Repository layout

```text
.
├── .claude-plugin/
│   └── marketplace.json          # marketplace catalog; this repository is the marketplace root
├── .research/
└── plugins/
    ├── scrapider-guidelines/     # plugin root
    │   ├── .codex-plugin/
    │   │   └── plugin.json
    │   ├── .claude-plugin/
    │   │   └── plugin.json
    │   ├── .zcode-plugin/
    │   │   └── plugin.json
    │   ├── assets/
    │   │   └── icon.png
    │   ├── commands/            # explicit standards-review command
    │   │   └── scrapider-review.md
    │   ├── agents/              # six collaboration role definitions
    │   └── skills/
    │       ├── scrapider-write-plan/
    │       ├── scrapider-execute-plan/
    │       └── scrapider-guidelines/
    │           ├── SKILL.md
    │           ├── agents/
    │           │   └── openai.yaml
    │           ├── references/
    │           │   ├── android/
    │           │   ├── java/
    │           │   ├── project/
    │           │   ├── python/
    │           │   └── shared/
    │           └── scripts/
    │               ├── run_inspection.mjs # Git scope and concise local inspection
    │               ├── inspection_parser.mjs # parser setup and cache
    │               ├── inspection_rules_*.mjs # Java and Python rules
    │               ├── package.json
    │               └── package-lock.json # locked parser dependencies
    └── scrapider-capabilities/   # optional MCP bundle: context7 + codegraph
        ├── .claude-plugin/
        │   └── plugin.json
        └── .zcode-plugin/
            └── plugin.json
```

## Research and evaluation

The [code-retrieval Token experiment](.research/2026-10-18-retrieval-token-benchmark/REPORT.md)
records the tested scenarios, measured usage, quality review, limitations, and resulting workflow
choices. Its [per-run metrics](.research/2026-10-18-retrieval-token-benchmark/metrics.csv) are
available for inspection. The [12-run Serena follow-up](.research/2026-10-18-serena-incremental-benefit/REPORT.md)
records the repaired response rendering, fixed scoring, repeated comparisons, and limits on attributing
benefits to an optional tool that workers did not invoke.
The `.research/` directory is for developers browsing this repository; it stays out of the
plugin payload, and the skill's loading routes do not reference it.

## Contributing

Keep contributions narrowly scoped, consistent with the existing guidance, and clear about the problem they solve. When adding or changing a rule, update the relevant routed reference rather than duplicating the same rule across unrelated documents.

## License

Distributed under the [MIT License](LICENSE).
