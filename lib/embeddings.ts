import { spawn } from 'node:child_process';
import path from 'node:path';
import { existsSync } from 'node:fs';

type EmbeddingPayload = {
  model: string;
  dimension: number;
  embedding: number[];
};

/**
 * Generate a real all-MiniLM-L6-v2 embedding by calling the project's local
 * Python environment. This keeps model inference out of the Next.js runtime.
 * Intended for the local/student deployment where .venv-embeddings is present.
 */
export async function generatePaperEmbedding(
  title: string,
  abstract: string | null | undefined
): Promise<number[]> {
  const projectRoot = process.cwd();
  const isWindows = process.platform === 'win32';
  const defaultPython = path.join(
    projectRoot,
    '.venv-embeddings',
    isWindows ? 'Scripts' : 'bin',
    isWindows ? 'python.exe' : 'python'
  );
  const pythonExecutable = process.env.EMBEDDING_PYTHON || defaultPython;
  const scriptPath = path.join(projectRoot, 'scripts', 'embed_single_paper.py');

  if (!existsSync(pythonExecutable)) {
    throw new Error(
      `Embedding Python was not found at ${pythonExecutable}. Create .venv-embeddings and install sentence-transformers, or set EMBEDDING_PYTHON in .env.local.`
    );
  }
  if (!existsSync(scriptPath)) {
    throw new Error(`Embedding script was not found at ${scriptPath}.`);
  }

  return new Promise<number[]>((resolve, reject) => {
    const child = spawn(pythonExecutable, [scriptPath], {
      cwd: projectRoot,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: process.env,
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const finishError = (error: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    };

    const timeout = setTimeout(() => {
      child.kill();
      finishError(new Error('MiniLM embedding generation timed out after 120 seconds.'));
    }, 120_000);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
      if (stdout.length > 2_000_000) {
        child.kill();
        finishError(new Error('Embedding script returned unexpectedly large output.'));
      }
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
      if (stderr.length > 1_000_000) {
        stderr = stderr.slice(-1_000_000);
      }
    });

    child.on('error', (error) => {
      finishError(new Error(`Could not start the MiniLM Python process: ${error.message}`));
    });

    child.on('close', (code) => {
      if (settled) return;
      clearTimeout(timeout);

      if (code !== 0) {
        finishError(
          new Error(`MiniLM embedding generation failed (exit ${code}). ${stderr.trim()}`)
        );
        return;
      }

      try {
        const payload = JSON.parse(stdout.trim()) as EmbeddingPayload;
        if (
          payload.model !== 'sentence-transformers/all-MiniLM-L6-v2' ||
          payload.dimension !== 384 ||
          !Array.isArray(payload.embedding) ||
          payload.embedding.length !== 384 ||
          !payload.embedding.every((value) => Number.isFinite(value))
        ) {
          throw new Error('Python returned an invalid model name or embedding vector.');
        }
        settled = true;
        resolve(payload.embedding);
      } catch (error: any) {
        finishError(
          new Error(`Could not read the MiniLM embedding result: ${error.message}. ${stderr.trim()}`)
        );
      }
    });

    child.stdin.on('error', (error) => {
      finishError(new Error(`Could not send paper text to the embedding process: ${error.message}`));
    });
    child.stdin.end(JSON.stringify({ title, abstract: abstract || '' }), 'utf8');
  });
}
