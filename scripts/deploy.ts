/**
 * deploy.ts — Upload WASM and deploy LuminaAgent contract to Stellar devnet.
 * Usage: ts-node deploy.ts
 */
import "dotenv/config";
import fs from "fs";
import {
  Keypair,
  SorobanRpc,
  TransactionBuilder,
  BASE_FEE,
  Operation,
  hash,
  xdr,
} from "@stellar/stellar-sdk";
import { keypair, server, NETWORK_PASSPHRASE, WASM_PATH } from "./helpers";

async function sendAndWait(tx: any) {
  const prepared = await server.prepareTransaction(tx);
  prepared.sign(keypair);
  const result = await server.sendTransaction(prepared);
  if (result.status === "ERROR") throw new Error(JSON.stringify(result.errorResult));
  let response = await server.getTransaction(result.hash);
  while (response.status === "NOT_FOUND") {
    await new Promise((r) => setTimeout(r, 1000));
    response = await server.getTransaction(result.hash);
  }
  if (response.status !== "SUCCESS") throw new Error("tx failed");
  return response;
}

async function main() {
  const wasm = fs.readFileSync(WASM_PATH);
  const account = await server.getAccount(keypair.publicKey());

  // 1. Upload WASM
  console.log("Uploading WASM…");
  const uploadTx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(Operation.uploadContractWasm({ wasm }))
    .setTimeout(30)
    .build();
  const uploadResult = await sendAndWait(uploadTx);
  const wasmHash = (uploadResult as any).returnValue?.bytes();
  console.log("WASM hash:", Buffer.from(wasmHash).toString("hex"));

  // 2. Deploy contract
  console.log("Deploying contract…");
  const account2 = await server.getAccount(keypair.publicKey());
  const deployTx = new TransactionBuilder(account2, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(
      Operation.createCustomContract({
        wasmHash,
        address: keypair.publicKey() as any,
        salt: Buffer.alloc(32),
      })
    )
    .setTimeout(30)
    .build();
  const deployResult = await sendAndWait(deployTx);
  const contractId = (deployResult as any).returnValue?.address()?.contractId();
  const contractIdStr = Buffer.from(contractId).toString("hex");
  console.log(`✅ Contract deployed: ${contractIdStr}`);
  console.log("Add to .env: CONTRACT_ID=" + contractIdStr);
}

main().catch((e) => { console.error(e); process.exit(1); });
