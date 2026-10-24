import { existsSync, readdirSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dir, '../..');
const runDir = join(root, 'var', 'run');
const fixturePath = join(runDir, 'e2e-fixture.json');
const apiPort = Number(process.env.QA_API_PORT ?? '3011');
const uiPort = Number(process.env.QA_UI_PORT ?? '3001');
const apiOrigin = `http://127.0.0.1:${apiPort}`;
const uiOrigin = process.env.PLATFORM_TEST_URL ?? `http://127.0.0.1:${uiPort}`;

function clearCachedSessions() {
  if (!existsSync(runDir)) return;
  for (const entry of readdirSync(runDir)) {
    if (entry.startsWith('e2e-session-') && entry.endsWith('.txt')) {
      rmSync(join(runDir, entry), { force: true });
    }
  }
}

async function waitForHttp(url: string, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server still starting
    }
    await Bun.sleep(250);
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function waitForFile(filePath: string, timeoutMs = 30_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (existsSync(filePath)) return;
    await Bun.sleep(200);
  }
  throw new Error(`Timed out waiting for file ${filePath}`);
}

function killSubprocess(proc: ReturnType<typeof Bun.spawn> | undefined) {
  if (!proc) return;
  try {
    proc.kill();
  } catch {
    // Ignore if already exited
  }
  if (process.platform === 'win32' && proc.pid) {
    spawnSync('taskkill', ['/PID', String(proc.pid), '/T', '/F'], { stdio: 'ignore' });
  }
}

let qaProc: ReturnType<typeof Bun.spawn> | undefined;
let viteProc: ReturnType<typeof Bun.spawn> | undefined;

try {
  const reuseServer = process.env.E2E_REUSE_SERVER === '1';
  if (!reuseServer) {
    rmSync(fixturePath, { force: true });
    clearCachedSessions();

    qaProc = Bun.spawn([process.execPath, join(root, 'scripts', 'qa-platform.ts')], {
      cwd: root,
      stdout: 'inherit',
      stderr: 'inherit',
      env: {
        ...process.env,
        QA_API_PORT: String(apiPort),
        QA_UI_ORIGIN: uiOrigin,
      },
    });

    viteProc = Bun.spawn(
      [
        process.execPath,
        join(root, 'node_modules', 'vite', 'bin', 'vite.js'),
        `--port=${uiPort}`,
        '--strictPort',
        '--host=127.0.0.1',
      ],
      {
        cwd: root,
        stdout: 'inherit',
        stderr: 'inherit',
        env: {
          ...process.env,
          PLATFORM_API_TARGET: apiOrigin,
        },
      },
    );

    await waitForFile(fixturePath, 30_000);
    await waitForHttp(`${apiOrigin}/api/platform/catalogue?limit=1`, 30_000);
    await waitForHttp(`${uiOrigin}/login`, 30_000);
  }

  const cliPath = join(root, 'node_modules', '@playwright', 'test', 'cli.js');
  const playwrightProc = Bun.spawn(
    ['node', cliPath, 'test', '-c', 'tests/playwright.config.ts', ...process.argv.slice(2)],
    {
      cwd: root,
      stdout: 'inherit',
      stderr: 'inherit',
      env: {
        ...process.env,
        PLATFORM_TEST_URL: uiOrigin,
      },
    },
  );

  const exitCode = await playwrightProc.exited;
  process.exitCode = exitCode;
} finally {
  killSubprocess(viteProc);
  killSubprocess(qaProc);
}
