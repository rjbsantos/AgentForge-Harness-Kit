import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { safe } from './installer.js';

// Indicadores de uso do próprio kit, lidos do registo de auditoria e dos fluxos arquivados: quantos
// fluxos se fecham, quantos passos se dispensam, quantos pedidos a porta de entrada recusa e o que a
// guarda travou. Não mede a qualidade do resultado, só se o processo foi seguido.
export interface UsageInsights {
  flows: {
    started: number; closed: number; abandoned: number; completionRate: number;
    stepsDone: number; stepsSkipped: number; skipRate: number; evidenceRate: number;
    byWorkflow: Record<string, { closed: number; skipped: number }>;
  };
  gate: { checks: number; rejected: number; rejectionRate: number };
  guard: { denied: number; byRule: Record<string, number>; permits: number };
}

export async function usageInsights(project: string): Promise<UsageInsights> {
  const root = resolve(project);
  const out: UsageInsights = {
    flows: { started: 0, closed: 0, abandoned: 0, completionRate: 0, stepsDone: 0, stepsSkipped: 0, skipRate: 0, evidenceRate: 0, byWorkflow: {} },
    gate: { checks: 0, rejected: 0, rejectionRate: 0 },
    guard: { denied: 0, byRule: {}, permits: 0 }
  };
  const auditPath = safe(root, '.agentforge/work/audit.jsonl');
  if (existsSync(auditPath)) {
    for (const line of (await readFile(auditPath, 'utf8')).split('\n')) {
      if (!line.trim()) continue;
      let entry: Record<string, string>;
      try { entry = JSON.parse(line); } catch { continue; }
      switch (entry.action) {
        case 'flow.start': out.flows.started++; break;
        case 'flow.close': out.flows.closed++; break;
        case 'flow.abandon': out.flows.abandoned++; break;
        case 'gate': out.gate.checks++; if (entry.ready === 'false') out.gate.rejected++; break;
        case 'guard.deny': out.guard.denied++; out.guard.byRule[entry.rule] = (out.guard.byRule[entry.rule] ?? 0) + 1; break;
        case 'guard.permit': out.guard.permits++; break;
      }
    }
  }
  const dir = safe(root, '.agentforge/work/flows');
  let withEvidence = 0;
  if (existsSync(dir)) {
    for (const name of (await readdir(dir)).filter(item => item.endsWith('.json')).slice(-200)) {
      try {
        const state = JSON.parse(await readFile(safe(root, `.agentforge/work/flows/${name}`), 'utf8')) as
          { workflow: string; steps: { status: string; evidence?: string }[] };
        const cell = (out.flows.byWorkflow[state.workflow] ??= { closed: 0, skipped: 0 });
        cell.closed++;
        for (const step of state.steps) {
          if (step.status === 'done') { out.flows.stepsDone++; if (step.evidence) withEvidence++; }
          if (step.status === 'skipped') { out.flows.stepsSkipped++; cell.skipped++; }
        }
      } catch { /* arquivo ilegível: ignorado */ }
    }
  }
  const steps = out.flows.stepsDone + out.flows.stepsSkipped;
  const round = (value: number) => Math.round(value * 1000) / 1000;
  out.flows.completionRate = out.flows.started ? round(out.flows.closed / out.flows.started) : 0;
  out.flows.skipRate = steps ? round(out.flows.stepsSkipped / steps) : 0;
  out.flows.evidenceRate = out.flows.stepsDone ? round(withEvidence / out.flows.stepsDone) : 0;
  out.gate.rejectionRate = out.gate.checks ? round(out.gate.rejected / out.gate.checks) : 0;
  return out;
}
