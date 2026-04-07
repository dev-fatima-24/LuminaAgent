/**
 * add-rules.ts — Add sample time-based and threshold-based rules.
 */
import { invoke, keypair, u64, native, WALLET_ID } from "./helpers";
import { Address, nativeToScVal, xdr } from "@stellar/stellar-sdk";

const walletId = BigInt(WALLET_ID);

function makeRule(
  ruleType: string,
  target: string,
  asset: string,
  amount: bigint,
  param: bigint
) {
  return nativeToScVal({
    rule_type: { [ruleType]: null },
    target: new Address(target),
    asset,
    amount,
    active: true,
    last_executed: 0n,
    param,
  });
}

async function main() {
  const target = keypair.publicKey(); // use deployer as target for demo

  // Time-based: execute every 3600 seconds
  console.log("Adding time-based rule…");
  await invoke("add_rule", [
    u64(walletId),
    makeRule("TimeBased", target, "XLM", 100n, 3600n),
  ]);
  console.log("✅ Time-based rule added");

  // Threshold-based: execute when balance >= 500
  console.log("Adding threshold-based rule…");
  await invoke("add_rule", [
    u64(walletId),
    makeRule("ThresholdBased", target, "XLM", 50n, 500n),
  ]);
  console.log("✅ Threshold-based rule added");
}

main().catch((e) => { console.error(e); process.exit(1); });
