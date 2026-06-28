import { verifyAllScenarios } from "../src/lib/scenarios";

const { ok, results } = verifyAllScenarios();

for (const r of results) {
  console.log(`${r.pass ? "✅" : "❌"} ${r.id} → ${r.verdict}`);
}

console.log(ok ? "\nALL PASS ✓" : "\nSOME FAILED ✗");
process.exit(ok ? 0 : 1);
