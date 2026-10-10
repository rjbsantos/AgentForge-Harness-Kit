import { createInterface } from 'node:readline';
// A aprovação de lições e a revisão do selo exigem uma pessoa num terminal. Um agente que corre
// comandos com stdin redireccionado (o caso normal dos CLIs anfitriões) não é um TTY e é recusado.
// Não impede quem simule um pseudo-terminal: é uma barreira contra o uso inadvertido, não uma sandbox.
export async function confirmOnTerminal(summary) {
    if (!process.stdin.isTTY) {
        throw new Error('Esta acção exige confirmação humana num terminal interactivo (stdin não é um TTY); execute o comando directamente num terminal.');
    }
    const lines = createInterface({ input: process.stdin, output: process.stderr });
    try {
        const answer = await new Promise(done => lines.question(`${summary}\nConfirmar? [s/N] `, done));
        if (!/^(s|sim|y|yes)$/i.test(answer.trim()))
            throw new Error('Não confirmado; nada foi alterado.');
    }
    finally {
        lines.close();
    }
}
//# sourceMappingURL=approval.js.map