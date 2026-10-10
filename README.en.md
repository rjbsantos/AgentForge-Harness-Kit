# AgentForge Harness Kit

> English summary. The full documentation, and the instructions installed into projects, are in Portuguese (pt-PT): see [README.md](README.md).

AgentForge Harness Kit installs instructions and capabilities for AI coding CLIs into a project so that the chosen tool works with consistent roles, skills, workflows, validation criteria and safety rules. It supports **OpenCode, Codex CLI, Claude Code and Google Antigravity**. It is not a model, does not replace those CLIs, and does not run agents, tools or integrations on its own.

## What it provides

- Thirteen working profiles and 22 specialist agents (project and IS management, AI and agent engineering, senior, frontend and backend development, design system, databases, context and memory, magazine editing, university study, systems analysis), 39 reusable skills (TDD, Python, .NET, React, SQL/PostgreSQL/MySQL, design system with a default, accessibility, visual validation, AI and prompt engineering, LangChain/LangGraph, Microsoft Agent Framework, memory, production readiness), `/af-…` commands (native in Claude Code and OpenCode), an end-to-end `/af-build` flow, a minimal startup (HARNESS.md and state only) and reusable skills and verifiable workflows.
- Complexity-based model routing: it *recommends* a reasoning or an economy model; it never switches models or calls providers.
- Local context and memory: project state, an active summary and lessons that need evidence and human approval. `lessons.json` is sealed with a hash; edits made outside the CLI are detected and the lessons are not reused until a person runs `learn reseal`.
- Reversible installation: a manifest with file hashes, conflict detection, transactional writes (rollback on failure), path-traversal and symlink protection. User-modified files and work data are preserved on update and uninstall.
- Optional observability: explicit run records (`record`, `insights`) and an opt-in Claude Code hook that stores only a timestamp and a tool name.
- Concepts from [graphify](https://github.com/Graphify-Labs/graphify): every audit/analysis conclusion carries a confidence label (`EXTRACTED`, `INFERRED`, `AMBIGUOUS`); a `forge-graph` skill makes agents query an existing `graphify-out/graph.json` before reading files; `agentforge graph` turns the capability catalog itself into a queryable, deterministic graph.
- For Claude Code, the install also ships Anthropic's official `claude-automation-recommender` skill (from the `claude-code-setup` plugin, Apache-2.0, unmodified; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)), which recommends hooks, subagents, skills, MCP servers and plugins for the project. It is read-only.
- Optional [OmniRoute](https://github.com/diegosouzapw/OmniRoute) gateway integration: `agentforge gateway omniroute [--write]` maps the `thinking`/`economy` tiers to `auto/coding` and `auto/cheap` in `model-profiles.json` and prints per-CLI connection commands. It does not install or run the gateway; read the privacy notes in `docs/integrations/OMNIROUTE.md` first (prompts reach whichever provider the gateway picks, including third-party free tiers).
- Token savings: `agentforge tokens` measures what the harness puts in context (startup budget of 1500 estimated tokens, only HARNESS.md and state.md are read, the options menu is shown afterwards, user instruction size, state growth); `operator set --verbosity concise` installs terse-answer rules that never compress risk warnings or approvals; `docs/integrations/TOKEN-TOOLS.md` maps ten popular token tools (RTK, Context Mode, Caveman, Token Optimizer, Claude Context, …) to what the kit does natively and what stays an optional external install. Their savings figures are the authors' own and were not measured here.
- A read-only MCP server (`agentforge mcp`) exposing `plan`, `route`, `context`, `lessons` and `insights`.

## Quick start

```bash
gh release download v0.11.0 --repo rjbsantos/AgentForge-Harness-Kit --pattern 'agentforge-harness-kit-*.tgz'
npm install -g ./agentforge-harness-kit-*.tgz
agentforge install --project <project> --cli claude
agentforge plan --project <project> --cli claude --prompt "Audit the repository"
agentforge doctor --project <project>
```

`<project>` is the project folder; command syntax is identical on Windows, Linux and macOS.

## How it works

```text
Request → profile and workflow → skills and tools → model recommendation and coordination plan
        → execution by the CLI, with approvals → evidence-based validation → local record → lessons reviewed by a person
```

A **profile** is a professional perspective, an **agent** a specialist, a **skill** a reusable capability, a **workflow** the steps and validations, a **tool** something the CLI must confirm, and a **template** the shape of the output. `plan` only proposes: it never runs commands, tests, APIs or sub-agents, and tools stay `unverified` until the CLI confirms them.

## Skills

Fourteen shared skills (`forge-requirements`, `-implementation`, `-audit`, `-hygiene`, `-verify`, `-ground`, `-graph`, `-performance`, `-tradeoff`, `-spike`, `-routing`, `-context`, `-research`, `-fact-check`) plus `forge-debug` (root-cause debugging) and `forge-prose` (prose review in European Portuguese). The authoritative list is `docs/skills/CATALOG.md`. A new skill is only added under the criteria in `docs/decisions/0003-novas-competencias.md`.

## Install

Requires Node.js 20+. The repository is private; download a release tarball with the GitHub CLI.

```bash
gh auth login
gh release download v0.11.0 --repo rjbsantos/AgentForge-Harness-Kit --pattern 'agentforge-harness-kit-*.tgz'
npm install -g ./agentforge-harness-kit-*.tgz
agentforge install --project /path/to/project --cli all   # opencode | codex | claude | antigravity | all
```

## Commands

| Command | Purpose |
| --- | --- |
| `install` / `uninstall [--dry-run]` | Add or remove managed files for the chosen CLI(s) |
| `upgrade [--dry-run]` | Re-apply the installed version to the CLIs already in the manifest |
| `status` / `doctor` | Report altered files; `doctor` also checks pending upgrades and lesson integrity (exit 1 on problems) |
| `plan` / `route` | Propose profile, workflow and model tier for a request (no execution) |
| `context [save]` | Show or update the active context within a token budget |
| `learn add\|list\|approve\|retire\|reseal` | Manage lessons (evidence and human approval required) |
| `record` / `insights` | Record and aggregate explicit run results |
| `tokens` | Measure the harness's context footprint (exit 1 on excess) |
| `gateway omniroute [--write]` | Preview or write the OmniRoute model mapping |
| `hooks install\|remove` | Opt-in Claude Code hook that logs tool names only |
| `mcp` | Start the read-only MCP server over stdio |

MCP client configuration example:

```json
{ "mcpServers": { "agentforge": { "command": "agentforge", "args": ["mcp", "--project", "/path/to/project"] } } }
```

## Installed files

| Location | Content |
| --- | --- |
| `.agentforge/HARNESS.md`, `CAPABILITIES.md` | Rules and the catalog of profiles, workflows, skills and tools |
| `.agentforge/workflows/`, `templates/`, `roles/` | Workflow definitions, output templates, role instructions |
| `.agentforge/work/` | State, context, operator profile, lessons (not shared by the package; keep secrets out) |
| `.agents/`, `.claude/`, `.codex/`, `.opencode/` | Native integration for the chosen CLI |

## Known limits

- No automatic evaluation of answer quality per profile yet; the protocol is in `docs/testing/EVALUATION.md` and nothing in it is executed by the suite.
- Token estimates are characters ÷ 4, not a model tokenizer. Savings claimed by third-party tools are not reproduced here.
- Catalogs and installed instructions are in Portuguese on purpose: they are what the agents read.

Full command reference: `docs/operations/COMMANDS.md` (Portuguese). Documentation index: `docs/README.md`.

## Development

```bash
npm ci
npm test            # build + unit, contract and CLI tests
npm run smoke       # packs, installs the tarball in a temp project and exercises the CLI
npm run coverage
```

`dist/` is committed so a Git install needs no compiler; CI fails if it is out of sync with `src/`.
