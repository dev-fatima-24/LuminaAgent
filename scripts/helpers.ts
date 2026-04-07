// Shared helpers for all scripts
import "dotenv/config";
import {
  Contract,
  Keypair,
  SorobanRpc,
  TransactionBuilder,
  BASE_FEE,
  xdr,
  nativeToScVal,
  scValToNative,
} from "@stellar/stellar-sdk";
import fs from "fs";

export const {
  DEPLOYER_SECRET = "",
  NETWORK_PASSPHRASE = "Test SDF Network ; September 2015",
  RPC_URL = "https://soroban-testnet.stellar.org",
  CONTRACT_ID = "",
  WALLET_ID = "0",
  WASM_PATH = "../contracts/target/wasm32-unknown-unknown/release/lumina_agent.wasm",
} = process.env;

export const keypair = Keypair.fromSecret(DEPLOYER_SECRET);
export const server = new SorobanRpc.Server(RPC_URL);

export async function invoke(method: string, args: xdr.ScVal[]): Promise<xdr.ScVal> {
  const account = await server.getAccount(keypair.publicKey());
  const contract = new Contract(CONTRACT_ID);
  const tx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const prepared = await server.prepareTransaction(tx);
  (prepared as any).sign(keypair);
  const result = await server.sendTransaction(prepared as any);
  if (result.status === "ERROR") throw new Error(JSON.stringify(result.errorResult));

  let response = await server.getTransaction(result.hash);
  while (response.status === "NOT_FOUND") {
    await new Promise((r) => setTimeout(r, 1000));
    response = await server.getTransaction(result.hash);
  }
  if (response.status !== "SUCCESS") throw new Error("tx failed");
  return (response as any).returnValue ?? xdr.ScVal.scvVoid();
}

export function u64(n: bigint) { return nativeToScVal(n, { type: "u64" }); }
export function native(v: unknown) { return nativeToScVal(v); }
export function fromScVal(v: xdr.ScVal) { return scValToNative(v); }
