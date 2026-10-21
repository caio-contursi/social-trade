import { spawn, execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, rm, writeFile, open, readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { createConnection } from "node:net";
import { randomUUID } from "node:crypto";

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repo = resolve(frontend, "..");
const directory = await mkdtemp(join(tmpdir(), "socialtrade-e2e-"));
const sleep = (ms) => new Promise((accept) => setTimeout(accept, ms));
const execute = promisify(execFile);
const servers = [];
let activeCommand;
let interrupted = false;
let lockOwned = false;
let schemaCreated = false;
const databaseSchema = `st_e2e_${randomUUID().replaceAll("-", "")}`;
const lockPath = join(frontend, ".e2e-run.lock");
const env = {
  ...process.env,
  SOCIALTRADE_E2E: "1",
  // Apenas a URL de teste explícita é aceita. A configuração normal da aplicação
  // nunca é usada como alternativa para preparar ou limpar os dados do E2E.
  SOCIALTRADE_DATABASE_URL: process.env.SOCIALTRADE_TEST_DATABASE_URL || "",
  SOCIALTRADE_DATABASE_SCHEMA: databaseSchema,
  SOCIALTRADE_DEMO_USERS: "false",
  SOCIALTRADE_TOKEN_SECRET: "isolated-e2e-secret-not-for-production",
  PYTHON_DOTENV_DISABLED: "1",
  PYTHONDONTWRITEBYTECODE: "1",
  NEXT_TELEMETRY_DISABLED: "1",
  NO_PROXY: [process.env.NO_PROXY || process.env.no_proxy, "127.0.0.1", "localhost", "::1"].filter(Boolean).join(","),
};
const apiPort = Number(process.env.SOCIALTRADE_E2E_API_PORT || "8765");
const frontendPort = Number(process.env.SOCIALTRADE_E2E_FRONTEND_PORT || "3100");
env.SOCIALTRADE_API_URL = `http://127.0.0.1:${apiPort}`;
env.SOCIALTRADE_E2E_FRONTEND_PORT = String(frontendPort);
const virtualPython = join(repo, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
const python = process.env.SOCIALTRADE_TEST_PYTHON || (existsSync(virtualPython) ? virtualPython : "python");
delete env.SOCIALTRADE_DB;

async function runPython(args) {
  const entry = start(python, args, repo, "Preparação PostgreSQL");
  activeCommand = entry;
  const code = await entry.exited;
  activeCommand = undefined;
  if (entry.error) throw entry.error;
  if (code !== 0) throw new Error(`Preparação PostgreSQL terminou com código ${code}.`);
}

async function changeTestSchema(action) {
  if (!/^st_e2e_[a-f0-9]{32}$/.test(databaseSchema)) {
    throw new Error("Nome de schema E2E inválido; nenhuma limpeza será executada.");
  }
  // O nome vem exclusivamente do UUID desta execução, jamais de um env externo.
  await runPython(["-c", `
import os, re
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
schema = os.environ["SOCIALTRADE_DATABASE_SCHEMA"]
assert re.fullmatch(r"st_e2e_[a-f0-9]{32}", schema), "Schema E2E inválido"
url = make_url(os.environ["SOCIALTRADE_DATABASE_URL"])
assert url.get_backend_name() == "postgresql", "E2E exige PostgreSQL real"
engine = create_engine(url.set(drivername="postgresql+psycopg"))
try:
    with engine.begin() as connection:
        connection.execute(text('${action === "create" ? "CREATE SCHEMA" : "DROP SCHEMA IF EXISTS"} "' + schema + '"${action === "create" ? "" : " CASCADE"}'))
finally:
    engine.dispose()
`]);
}

function start(command, args, cwd, label, quiet = false) {
  const child = spawn(command, args, {
    cwd, env, shell: false, windowsHide: true,
    detached: process.platform !== "win32",
    stdio: quiet ? ["ignore", "pipe", "pipe"] : "inherit",
  });
  const entry = { child, label, extraPids: new Set(), error: null };
  entry.exited = new Promise((accept) => {
    child.once("error", (error) => { entry.error = error; accept(1); });
    child.once("exit", (code) => accept(code ?? 1));
  });
  if (quiet) {
    child.stdout.on("data", (data) => process.stdout.write(`[${label}] ${data}`));
    child.stderr.on("data", (data) => {
      // The Windows venv launcher starts a second Python process.
      const match = String(data).match(/Started server process \[(\d+)\]/);
      if (match) entry.extraPids.add(Number(match[1]));
      process.stderr.write(`[${label}] ${data}`);
    });
  }
  return entry;
}

async function stop(entry) {
  if (!entry?.child.pid) return;
  const { child } = entry;
  if (process.platform === "win32") {
    if (child.exitCode === null && child.signalCode === null) {
      try {
        await execute(join(process.env.SystemRoot || "C:\\Windows", "System32", "taskkill.exe"),
          ["/PID", String(child.pid), "/T", "/F"], { windowsHide: true, timeout: 10_000 });
      } catch {
        // Bounded fallback targets only processes started by this runner.
        child.kill();
        for (const pid of entry.extraPids) {
          try { process.kill(pid); } catch (error) { if (error.code !== "ESRCH") throw error; }
        }
      }
    }
  } else {
    try { process.kill(-child.pid, "SIGTERM"); } catch (error) { if (error.code !== "ESRCH") throw error; }
    const ended = await Promise.race([entry.exited.then(() => true), sleep(3000).then(() => false)]);
    if (!ended) {
      try { process.kill(-child.pid, "SIGKILL"); } catch (error) { if (error.code !== "ESRCH") throw error; }
    }
  }
  const ended = await Promise.race([entry.exited.then(() => true), sleep(3000).then(() => false)]);
  if (!ended) throw new Error(`Não foi possível encerrar ${entry.label}.`);
}

async function acquireLock() {
  try {
    const handle = await open(lockPath, "wx");
    lockOwned = true;
    try { await handle.writeFile(JSON.stringify({ pid: process.pid })); }
    finally { await handle.close(); }
  } catch (error) {
    if (error.code !== "EEXIST") throw error;
    let pid;
    try { pid = JSON.parse(await readFile(lockPath, "utf8")).pid; }
    catch { throw new Error("Há uma execução E2E em preparação ou um lock inválido em .e2e-run.lock."); }
    if (!Number.isInteger(pid) || pid <= 0) throw new Error("Lock E2E inválido.");
    try { process.kill(pid, 0); }
    catch (cause) {
      if (cause.code === "ESRCH") {
        throw new Error(`O PID ${pid} do lock anterior já encerrou. Remova frontend/.e2e-run.lock antes de executar novamente.`);
      }
      throw cause;
    }
    throw new Error(`Outra execução E2E está ativa (PID ${pid}).`);
  }
}

function assertFree(port) {
  return new Promise((accept, reject) => {
    const socket = createConnection({ host: "127.0.0.1", port });
    socket.setTimeout(2000);
    socket.once("connect", () => { socket.destroy(); reject(new Error(`Porta ${port} ocupada; nenhum servidor existente será reutilizado.`)); });
    socket.once("timeout", () => { socket.destroy(); reject(new Error(`Não foi possível verificar a porta ${port}.`)); });
    socket.once("error", (error) => {
      socket.destroy();
      if (error.code === "ECONNREFUSED") accept();
      else reject(error);
    });
  });
}

async function ready(entry, url) {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (interrupted) throw new Error("Execução interrompida.");
    if (entry.error || entry.child.exitCode !== null || entry.child.signalCode !== null) {
      throw entry.error || new Error(`${entry.label} encerrou antes de ficar disponível.`);
    }
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
      await response.arrayBuffer();
      if (response.ok) return;
    } catch { /* Wait only for the process owned by this run. */ }
    await sleep(250);
  }
  throw new Error(`Tempo excedido para iniciar ${entry.label}.`);
}

async function run(script, args) {
  const entry = start(process.execPath, [join(frontend, script), ...args], frontend, script);
  activeCommand = entry;
  const code = await entry.exited;
  activeCommand = undefined;
  if (entry.error) throw entry.error;
  if (code !== 0) throw new Error(`${script} terminou com código ${code}.`);
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    interrupted = true;
    if (activeCommand) void stop(activeCommand).catch((error) => console.error(error.message));
  });
}

try {
  if (!/^postgresql\+psycopg:\/\//.test(env.SOCIALTRADE_DATABASE_URL)) {
    throw new Error("Defina SOCIALTRADE_TEST_DATABASE_URL para um PostgreSQL real e exclusivo de testes antes do E2E.");
  }
  if (![apiPort, frontendPort].every((port) => Number.isInteger(port) && port >= 1024 && port <= 65535) || apiPort === frontendPort) {
    throw new Error("Configure duas portas de teste diferentes entre 1024 e 65535.");
  }
  await acquireLock();
  await writeFile(join(directory, ".socialtrade-test"), "isolated-e2e\n");
  await Promise.all([assertFree(apiPort), assertFree(frontendPort)]);
  await changeTestSchema("create");
  schemaCreated = true;
  await runPython(["-m", "alembic", "upgrade", "head"]);
  await runPython(["-m", "app.seed", "--environment", "test"]);
  await run("node_modules/next/dist/bin/next", ["build"]);
  if (interrupted) throw new Error("Execução interrompida.");
  servers.push(start(python, ["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", String(apiPort)], repo, "API isolada", true));
  servers.push(start(process.execPath, [join(frontend, "node_modules/next/dist/bin/next"), "start", "--hostname", "127.0.0.1", "--port", String(frontendPort)], frontend, "Next.js de teste", true));
  await Promise.all([
    ready(servers[0], `${env.SOCIALTRADE_API_URL}/health`),
    ready(servers[1], `http://127.0.0.1:${frontendPort}/entrar`),
  ]);
  await run("node_modules/@playwright/test/cli.js", ["test", ...process.argv.slice(2)]);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  for (const entry of servers.reverse()) {
    try { await stop(entry); } catch (error) { console.error(error.message); process.exitCode = 1; }
  }
  if (schemaCreated) {
    try { await changeTestSchema("drop"); }
    catch (error) { console.error(`Não foi possível limpar o schema de testes: ${error.message}`); process.exitCode = 1; }
  }
  if (lockOwned) await unlink(lockPath).catch((error) => { console.error(error.message); process.exitCode = 1; });
  try { await rm(directory, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 }); }
  catch (error) { console.error(`Não foi possível limpar os dados temporários: ${error.message}`); process.exitCode = 1; }
}
