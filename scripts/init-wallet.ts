/**
 * init-wallet.ts — Initialize a wallet on the deployed contract.
 */
import { invoke, keypair, u64, WALLET_ID, fromScVal } from "./helpers";
import { Address } from "@stellar/stellar-sdk";

async function main() {
  const walletId = BigInt(WALLET_ID);
  console.log(`Initializing wallet ${walletId} for ${keypair.publicKey()}…`);
  const result = await invoke("init_wallet", [
    u64(walletId),
    new Address(keypair.publicKey()).toScVal(),
  ]);
  console.log("✅ Wallet initialized:", fromScVal(result));
}

main().catch((e) => { console.error(e); process.exit(1); });
