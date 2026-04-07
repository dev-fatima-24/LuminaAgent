/**
 * fetch-logs.ts — Fetch and print all on-chain execution logs.
 */
import { invoke, u64, fromScVal } from "./helpers";

async function main() {
  const countVal = await invoke("log_count", []);
  const count = fromScVal(countVal) as bigint;
  console.log(`Total execution logs: ${count}`);

  for (let i = 0n; i < count; i++) {
    const logVal = await invoke("get_log", [u64(i)]);
    const log = fromScVal(logVal) as any;
    console.log(`[${i}] wallet=${log.wallet_id} rule=${log.rule_id} amount=${log.amount} target=${log.target} ts=${log.timestamp}`);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
