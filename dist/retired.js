// Ficheiros que versões anteriores geravam e já não existem. O instalador remove-os (se não foram
// alterados) e retira-os do manifesto; sem isto, um manifesto antigo seria recusado como inválido.
// Cumulativo: acrescentar sempre, nunca apagar entradas.
export const retired = new Set([
    ".agentforge/roles/academic-tutor.md",
    ".agentforge/roles/editor.md",
    ".agentforge/templates/academic-research.md",
    ".agentforge/templates/magazine-article.md",
    ".agentforge/templates/study-guide.md",
    ".agentforge/workflows/academic-research.json",
    ".agentforge/workflows/magazine-article.json",
    ".agentforge/workflows/study-session.json",
    ".agents/workflows/academic-research.md",
    ".agents/workflows/magazine-article.md",
    ".agents/workflows/study-session.md",
    ".claude/agents/academic-tutor.md",
    ".claude/agents/editor.md",
    ".claude/commands/af-academic-research.md",
    ".claude/commands/af-magazine-article.md",
    ".claude/commands/af-study-session.md",
    ".codex/agents/academic-tutor.toml",
    ".codex/agents/editor.toml",
    ".opencode/agents/academic-tutor.md",
    ".opencode/agents/editor.md",
    ".opencode/commands/af-academic-research.md",
    ".opencode/commands/af-magazine-article.md",
    ".opencode/commands/af-study-session.md"
]);
//# sourceMappingURL=retired.js.map