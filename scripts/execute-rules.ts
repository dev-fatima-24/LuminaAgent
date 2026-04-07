/**
 * execute-rules.ts — Execute rules by ID via script.
 * Usage: RULE_IDS=0,1 ts-node execute-rules.ts
 */
import { invoke, u64, WALLET_ID, fromScVal } from "./helpers";

const walletId = BigInt(WALLET_ID);
const ruleIds = (process.env.RULE_IDS ?? "0")
  .split(",")
  .map((r) => BigInt(r.trim()));

async function main() {
  if (ruleIds.length === 1) {
    console.log(`Executing rule ${ruleIds[0]}…`);
    await invoke("execute_rule", [u64(walletId), u64(ruleIds[0])]);
    console.log("✅ Done");
  } else {
    console.log(`Batch executing rules: ${ruleIds.join(", ")}…`);
    const { nativeToScVal } = await import("@stellar/stellar-sdk");
    await invoke("execute_batch", [
      u64(walletId),
      nativeToScVal(ruleIds, { type: "vec" }),
    ]);
    console.log("✅ Batch done");
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
