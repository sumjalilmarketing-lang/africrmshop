import { existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { spawn, spawnSync } from "node:child_process";

const [, , entrypoint, ...entrypointArgs] = process.argv;

if (!entrypoint) {
  console.error("Usage: node scripts/run-with-system-ca.mjs <script> [...args]");
  process.exit(1);
}

function ensureWindowsCertificateBundle() {
  if (process.platform !== "win32") return null;

  const certificatePath = resolve(".cache", "windows-root-ca.pem");
  mkdirSync(dirname(certificatePath), { recursive: true });

  const powershell = process.env.SystemRoot
    ? resolve(
        process.env.SystemRoot,
        "System32",
        "WindowsPowerShell",
        "v1.0",
        "powershell.exe",
      )
    : "powershell.exe";

  const command = `
$ErrorActionPreference = 'Stop'
$output = '${certificatePath.replaceAll("'", "''")}'
$certs = @(
  Get-ChildItem -Path Cert:\\CurrentUser\\Root -ErrorAction SilentlyContinue
  Get-ChildItem -Path Cert:\\LocalMachine\\Root -ErrorAction SilentlyContinue
  Get-ChildItem -Path Cert:\\CurrentUser\\CA -ErrorAction SilentlyContinue
  Get-ChildItem -Path Cert:\\LocalMachine\\CA -ErrorAction SilentlyContinue
) | Where-Object { $_.NotAfter -gt (Get-Date) } | Sort-Object Thumbprint -Unique
$pem = foreach ($cert in $certs) {
  '-----BEGIN CERTIFICATE-----'
  [Convert]::ToBase64String($cert.RawData, 'InsertLineBreaks')
  '-----END CERTIFICATE-----'
}
[IO.File]::WriteAllText($output, ($pem -join [Environment]::NewLine), [Text.Encoding]::ASCII)
`;

  if (!existsSync(certificatePath)) {
    const result = spawnSync(
      powershell,
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
      { stdio: "pipe", encoding: "utf8" },
    );

    if (result.status !== 0) {
      console.warn(
        "AFRICRM: impossible de préparer le bundle de certificats Windows. Le lancement continue avec la configuration Node par défaut.",
      );
      if (result.stderr) console.warn(result.stderr.trim());
      return null;
    }
  }

  return certificatePath;
}

const certificatePath = ensureWindowsCertificateBundle();
const child = spawn(process.execPath, [entrypoint, ...entrypointArgs], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    ...(certificatePath ? { NODE_EXTRA_CA_CERTS: certificatePath } : {}),
  },
  stdio: "inherit",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
