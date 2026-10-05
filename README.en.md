# AgentForge Harness Kit

> English summary. The full documentation, and the instructions installed into projects, are in Portuguese (pt-PT): see [README.md](README.md).

AgentForge Harness Kit installs instructions and capabilities for AI coding CLIs into a project so that the chosen tool works with consistent roles, skills, workflows, validation criteria and safety rules. It supports **OpenCode, Codex CLI, Claude Code and Google Antigravity**. It is not a model, does not replace those CLIs, and does not run agents, tools or integrations on its own.

## What it provides

- Seven working profiles (project manager, IT project manager, AI engineer, senior developer, magazine editor, university student, systems analyst), reusable skills and verifiable workflows.
- Complexity-based model routing: it *recommends* a reasoning or an economy model; it never switches models or calls providers.
- Local context and memory: project state, an active summary and lessons that need evidence and human approval. `lessons.json` is sealed with a hash; edits made outside the CLI are detected and the lessons are not reused until a person runs `learn reseal`.
- Reversible installation: a manifest with file hashes, conflict detection, transactional writes (rollback on failure), path-traversal and symlink protection. User-modified files and work data are preserved on update and uninstall.
- Optional observability: explicit run records (`record`, `insights`) and an opt-in Claude Code hook that stores only a timestamp and a tool name.
- Concepts from [graphify](https://github.com/Graphify-Labs/graphify): every audit/analysis conclusion carries a confidence label (`EXTRACTED`, `INFERRED`, `AMBIGUOUS`); a `forge-graph` skill makes agents query an existing `graphify-out/graph.json` before reading files; `agentforge graph` turns the capability catalog itself into a queryable, deterministic graph.
- For Claude Code, the install also ships Anthropic's official `claude-automation-recommender` skill (from the `claude-code-setup` plugin, Apache-2.0, unmodified; see [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)), which recommends hooks, subagents, skills, MCP servers and plugins for the project. It is read-only.
- Optional [OmniRoute](https://github.com/diegosouzapw/OmniRoute) gateway integration: `agentforge gateway omniroute [--write]` maps the `thinking`/`economy` tiers to `auto/coding` and `auto/cheap` in `model-profiles.json` and prints per-CLI connection commands. It does not install or run the gateway; read the privacy notes in `docs/integrations/OMNIROUTE.md` first (prompts reach whichever provider the gateway picks, including third-party free tiers).
- Token savings: `agentforge tokens` measures what the harness puts in context (startup budget of 3000 estimated tokens, user instruction size, state growth); `operator set --verbosity concise` installs terse-answer rules that never compress risk warnings or approvals; `docs/integrations/TOKEN-TOOLS.md` maps ten popular token tools (RTK, Context Mode, Caveman, Token Optimizer, Claude Context, …) to what the kit does natively and what stays an optional external install. Their savings figures are the authors' own and were not measured here.
- A read-only MCP server (`agentforge mcp`) exposing `plan`, `route`, `context`, `lessons` and `insights`.

## Install

Requires Node.js 20+. The repository is private; download a release tarball with the GitHub CLI.

```bash
gh auth login
gh release download v0.9.2 --repo rjbsantos/AgentForge-Harness-Kit --pattern 'agentforge-harness-kit-*.tgz'
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

## Development

```bash
npm ci
npm test            # build + unit, contract and CLI tests
npm run smoke       # packs, installs the tarball in a temp project and exercises the CLI
npm run coverage
```

`dist/` is committed so a Git install needs no compiler; CI fails if it is out of sync with `src/`.
