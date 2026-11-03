// Runs the Firestore security-rules tests against the Firebase emulator.
//   npm run test:rules
// Needs Java (the emulator is a Java program). Check with:  java -version
import { spawnSync } from "node:child_process";

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", shell: true, ...opts });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

const java = spawnSync("java", ["-version"], { shell: true, stdio: "ignore" });
if (java.status !== 0) {
  console.error("\nJava was not found. The Firebase emulator needs it.\nInstall it from https://adoptium.net (any version 17 or newer), then reopen the terminal.\n");
  process.exit(1);
}

console.log("1/2  Installing the rules-test helper (first time only)...");
run("npm", ["install", "--no-audit", "--no-fund"], { cwd: "tests/rules" });

console.log("2/2  Starting the emulator and running the tests...");
run("npx", [
  "--yes", "firebase-tools", "emulators:exec", "--only", "firestore", "--project", "demo-geopolitics",
  '"npx vitest run --config vitest.rules.config.mts"',
]);
