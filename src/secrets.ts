// Ficheiros de segredos que os agentes não devem ler pelas ferramentas nativas. Partilhado entre o
// `opencode.json` gerado, que o OpenCode resolve como regras `read` (a última que corresponde ganha;
// verificado com `opencode debug agent`), e `agentforge harden` para o Claude Code.
export const opencodeReadRules: Record<string, 'allow' | 'deny'> = {
  '*.env': 'deny', '*.env.*': 'deny', '*.env.example': 'allow',
  '*.pem': 'deny', '*.key': 'deny',
  '*/secrets/*': 'deny', '*/.ssh/*': 'deny', '*/.aws/*': 'deny', '*/.npmrc': 'deny'
};

export const claudeDenyRules: readonly string[] = [
  'Read(./.env)', 'Read(./.env.*)', 'Read(./**/.env)', 'Read(./**/.env.*)',
  'Read(./secrets/**)', 'Read(**/*.pem)', 'Read(**/*.key)',
  'Read(~/.ssh/**)', 'Read(~/.aws/**)', 'Read(~/.npmrc)'
];
