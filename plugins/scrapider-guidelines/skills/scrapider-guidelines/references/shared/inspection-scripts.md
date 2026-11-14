# Inspection Scripts

The bundled inspection runner checks source patterns from the Scrapider rules. Load this reference
for scripted Java standards review or inspection library maintenance.

Semantic rules — minimal-change fit, responsibility boundaries, exception semantics, business
contracts, and converter ownership — remain part of the standards review.

## Applicability and Findings

- J2 is enabled by default. Set `REQUIRE_MANAGE_LAYER` to `false` for projects without a `manage`
  layer. Confirm the layer is established in the reviewed module before reporting a J2 finding.
- Enable J3 with `REQUIRE_SERVICE_JAVADOC` where service-interface Javadoc is required. Supply
  `REQUIRED_TAGS` for J4 when a repository requires class header tags. Enable J5 with
  `REQUIRE_PARAM_FIELD_COMMENTS` where Param-field comments are an established convention. These
  checks are off by default.
- J19 always checks for empty catches. Enable its non-empty tier with `DETECT_SILENT_SWALLOW` where
  project instructions require logging swallowed exceptions.
- The runner emits J9, J12, J15, and PY3 candidates by default. Set `OPT_IN` to `false` to disable
  these checks. Review J15 candidates for a stable typed request contract, and report PY3 only for
  business-logic modules. The runner checks names without classifying a Python module's role.

## Running the Scripts

- The runner requires Node.js 18 or newer. On the first Java scan, it uses npm to fetch the locked,
  prebuilt parser into the user's cache if the parser is absent. Later scans reuse that installation.
- Run the local [inspection runner](../../scripts/run_inspection.mjs) from the project directory.
  With no arguments it checks existing staged, unstaged, and untracked Java files in the current Git
  repository. Deleted files and ignored untracked files are excluded. Pass file paths as arguments to
  inspect exactly those files. Explicitly supplied Python files also run PY1–PY3.

  ```sh
  node /path/to/skill/scripts/run_inspection.mjs
  node /path/to/skill/scripts/run_inspection.mjs src/main/java/A.java src/main/java/B.java
  printf '%s' '["src/main/java/A.java","src/main/java/B.java"]' | node /path/to/skill/scripts/run_inspection.mjs --files-stdin
  ```

- Programmatic callers can import `inspect` from `run_inspection.mjs` and call `await inspect()`
  or `await inspect(["src/main/java/A.java"])`. A second optional argument is the project directory.
  `--files-stdin` accepts a JSON array on standard input when a file list is too large for a command line.
- The runner checks the enabled rules and emits `PASS` when they complete without candidates, or
  concise `file:line [rule] message` lines. Repeated identical candidates in one file are
  combined using comma-separated line numbers. `SKIP: no files` means no files were selected.
  Lines beginning `INCOMPLETE` or `ERROR` identify unverified scope or execution failures. Exit codes
  are 0 for pass or skip, 1 for candidates, and 2 for an error or incomplete inspection.
- Set `SCRAPIDER_INSPECTION_SETTINGS` to a JSON object only where repository conventions require
  settings described below.

## Rule Library

| Rule | Checks | Rule source | Level | Runs on |
| --- | --- | --- | --- | --- |
| J1 | Controllers must not inject `*Mapper`/`*Manage` fields or constructor parameters | spring-boot-backend.md, Core Layered Architecture | ERROR | `@RestController`/`@Controller` classes |
| J2 | Flags direct `*Mapper` field injection where a `manage` layer is established | spring-boot-backend.md, Core Layered Architecture | WARNING | `@Service` classes, `*ServiceImpl` classes, and `*Service` interfaces |
| J3 | Service interface methods require javadoc, `@param` for each parameter, and `@return` for non-void results | spring-boot-backend.md, File and API Documentation | WARNING | `*Service` interfaces |
| J4 | Class header javadoc carries configured repository template tags | spring-boot-backend.md, File and API Documentation | WARNING | top-level classes in `.java` |
| J5 | Non-static `*Param` fields carry `@Schema(description=...)`, javadoc, or a leading comment | this reference | WARNING | `*Param` classes |
| J6 | Flag fields and methods annotated with `@Autowired` | spring-boot-backend.md, Dependency Injection | WARNING | any `.java` |
| J7 | No wildcard imports, including static imports | spring-boot-backend.md, Style and Naming | WARNING | any `.java` |
| J8 | Resolved `PrintStream.print/println/printf` and `Throwable.printStackTrace()` calls are flagged | spring-boot-backend.md, Logging | WARNING | any `.java` |
| J9 | Logger messages use `{}` placeholders instead of string concatenation | spring-boot-backend.md, Logging | WEAK_WARNING | any `.java` |
| J10 | Compare enums with `==`, not `equals()` or `ordinal()` comparisons | spring-boot-backend.md, Utilities and Value Handling | WARNING | any `.java` |
| J11 | Invoke utility statics through their class; single-member imports from `*Util` or configured utility classes are flagged | spring-boot-backend.md, Utilities and Value Handling | WARNING | any `.java` |
| J12 | Qualify unqualified instance-method calls on the current object with `this.` | spring-boot-backend.md, Style and Naming | WEAK_WARNING | any `.java` |
| J13 | Controllers must not return `PO`-suffixed types, including in wrapper generics | spring-boot-http-and-domain.md | ERROR | controller classes |
| J14 | No local `@ExceptionHandler` methods in controllers; `@ControllerAdvice` and `@RestControllerAdvice` classes are exempt | spring-boot-http-and-domain.md | ERROR | controller classes |
| J15 | Controller `@RequestBody` parameters typed as `Map` or `JsonNode` | spring-boot-http-and-domain.md | WEAK_WARNING | controller classes |
| J16 | Class names carry package-role suffixes; the `service` package applies the suffix to interfaces only | spring-boot-backend.md + spring-boot-architecture.md, Package Map | WARNING | classes in mapped packages |
| J17 | Enforce module import directions, placement bans, and tier order in the declared module dependency graph | spring-boot-multi-module.md | ERROR | `.java` in a multi-module repository |
| J18 | MyBatis-Plus plugin imports are limited to `.config` packages or `*Config` classes | spring-boot-architecture.md, config responsibility | ERROR | any `.java` |
| J19 | Empty catches and configured non-empty silent catches are flagged | this reference | WARNING | any `.java` |
| PY1 | Python module filenames use ASCII `snake_case` | python-code-organization.md, Naming Rules | WARNING | any `.py` |
| PY2 | Text matching `sys.path.append/insert/extend/remove` produces an `INCOMPLETE` candidate for manual verification | python-code-organization.md, Import Rules | ERROR | any `.py` |
| PY3 | Flags names such as `common`, `util`, `utils`, `helper`, `helpers`, and `misc` for review of business-logic modules | python-code-organization.md, Naming Rules | WEAK_WARNING | any explicit `.py` input |

The parser builds syntax trees and infers types from local source. Unresolved external types, method
owners, and project configurations can produce `INCOMPLETE` results. J17 derives its dependency
graph from Maven POMs. Gradle projects, unresolved active profiles, or unavailable parent POMs can
leave the graph incomplete.

J1 checks fields and constructor parameters only. J13 checks `PO`-suffixed types in the declared
return signature, not runtime objects hidden inside `Map` values. J17 reports one incomplete notice
per unresolved module and one dependency-graph finding per violating module pair per run; its import
bans additionally require the tier token in the file's own package so the root package can be derived.

## Adapting to a Repository

- Configure `EXCLUDED_TYPES` for J1 and J2 and `EXCLUDED_MAPPER_NAMES` for J17 if database type
  names collide with other types. The corresponding `ObjectMapper` exclusions are preset.
- `J11`: configure `EXPLICIT_UTILITY_CLASSES` for additional utility classes.
- `J16`: the package-to-suffix map is defined in the rule implementation.
- `J17`: tiers resolve from `MODULE_MAP` package-prefix overrides, then module and package naming
  tokens (`foundation`/`shared`/`common`/`core`, `entity`/`model`, `db`/`persistence`/`mapper`,
  `business`/`biz`, `bootstrap`/`app`); `business`/`bootstrap` naming wins over later tokens while
  `foundation-*` compounds take the most specific segment. Add `MODULE_MAP` entries only for
  non-conventional naming; files whose tier stays unresolved emit an `INCOMPLETE` notice instead of
  silently passing.
