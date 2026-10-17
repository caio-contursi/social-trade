import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repo = resolve(frontend, "..");
const venv = join(repo, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
const python = process.env.SOCIALTRADE_TEST_PYTHON || (existsSync(venv) ? venv : "python");

function run(command, args, cwd) {
  return new Promise((accept, reject) => {
    const child = spawn(command, args, {
      cwd, stdio: "inherit", windowsHide: true,
      env: { ...process.env, PYTHONDONTWRITEBYTECODE: "1" },
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) accept();
      else reject(new Error(`Verificação interrompida: ${signal || `código ${code}`}.`));
    });
  });
}
try {
  await run(python, ["-m", "pytest", "--cov=app", "--cov-report=term-missing", "--cov-report=xml:reports/api-coverage.xml", "--cov-fail-under=90", "--junitxml=reports/api-junit.xml"], repo);
  await run(process.execPath, ["node_modules/typescript/bin/tsc", "--noEmit"], frontend);
  await run(process.execPath, ["node_modules/vitest/vitest.mjs", "run", "--coverage"], frontend);
  await run(process.execPath, ["scripts/run-e2e.mjs"], frontend);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}