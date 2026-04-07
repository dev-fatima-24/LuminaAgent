import {
  Contract,
  Networks,
  SorobanRpc,
  TransactionBuilder,
  BASE_FEE,
  xdr,
  scValToNative,
  nativeToScVal,
  Address,
  Keypair,
} from "@stellar/stellar-sdk";
import { CONTRACT_ID, NETWORK_PASSPHRASE, RPC_URL } from "./config";

export interface Rule {
  rule_type: "TimeBased" | "ThresholdBased" | "ExternalSignal";
  target: string;
  asset: string;
  amount: bigint;
  active: boolean;
  last_executed: bigint;
  param: bigint;
}

export interface Wallet {
  owner: string;
  balance: bigint;
  rules: Rule[];
  paused: boolean;
  daily_spent: bigint;
  daily_limit: bigint;
  last_day: bigint;
}

export interface ExecLog {
  wallet_id: bigint;
  rule_id: bigint;
  timestamp: bigint;
  amount: bigint;
  target: string;
}

const server = new SorobanRpc.Server(RPC_URL);

async function invoke(
  keypair: Keypair,
  method: string,
  args: xdr.ScVal[]
): Promise<xdr.ScVal> {
  const account = await server.getAccount(keypair.publicKey());
  const contract = new Contract(CONTRACT_ID);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(30)
    .build();

  const prepared = await server.prepareTransaction(tx);
  prepared.sign(keypair);
  const result = await server.sendTransaction(prepared);

  if (result.status === "ERROR") throw new Error(JSON.stringify(result.errorResult));

  // Poll for completion
  let response = await server.getTransaction(result.hash);
  while (response.status === "NOT_FOUND") {
    await new Promise((r) => setTimeout(r, 1000));
    response = await server.getTransaction(result.hash);
  }
  if (response.status !== "SUCCESS") throw new Error("tx failed");
  return response.returnValue ?? xdr.ScVal.scvVoid();
}

export async function getWallet(walletId: bigint): Promise<Wallet> {
  const account = await server.getAccount(CONTRACT_ID).catch(() => null);
  const contract = new Contract(CONTRACT_ID);
  const result = await server.simulateTransaction(
    new TransactionBuilder(
      { accountId: () => CONTRACT_ID, sequenceNumber: () => "0", incrementSequenceNumber: () => {} } as any,
      { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE }
    )
      .addOperation(contract.call("get_wallet", nativeToScVal(walletId, { type: "u64" })))
      .setTimeout(30)
      .build()
  );
  if (SorobanRpc.Api.isSimulationError(result)) throw new Error(result.error);
  const val = (result as SorobanRpc.Api.SimulateTransactionSuccessResponse).result?.retval;
  return scValToNative(val!) as Wallet;
}

export async function initWallet(keypair: Keypair, walletId: bigint): Promise<void> {
  await invoke(keypair, "init_wallet", [
    nativeToScVal(walletId, { type: "u64" }),
    new Address(keypair.publicKey()).toScVal(),
  ]);
}

export async function addRule(keypair: Keypair, walletId: bigint, rule: Rule): Promise<void> {
  await invoke(keypair, "add_rule", [
    nativeToScVal(walletId, { type: "u64" }),
    nativeToScVal(rule),
  ]);
}

export async function updateRule(
  keypair: Keypair,
  walletId: bigint,
  ruleId: bigint,
  rule: Rule
): Promise<void> {
  await invoke(keypair, "update_rule", [
    nativeToScVal(walletId, { type: "u64" }),
    nativeToScVal(ruleId, { type: "u64" }),
    nativeToScVal(rule),
  ]);
}

export async function deactivateRule(
  keypair: Keypair,
  walletId: bigint,
  ruleId: bigint
): Promise<void> {
  await invoke(keypair, "deactivate_rule", [
    nativeToScVal(walletId, { type: "u64" }),
    nativeToScVal(ruleId, { type: "u64" }),
  ]);
}

export async function executeRule(
  keypair: Keypair,
  walletId: bigint,
  ruleId: bigint
): Promise<void> {
  await invoke(keypair, "execute_rule", [
    nativeToScVal(walletId, { type: "u64" }),
    nativeToScVal(ruleId, { type: "u64" }),
  ]);
}

export async function getLog(logId: bigint): Promise<ExecLog> {
  const contract = new Contract(CONTRACT_ID);
  const result = await server.simulateTransaction(
    new TransactionBuilder(
      { accountId: () => CONTRACT_ID, sequenceNumber: () => "0", incrementSequenceNumber: () => {} } as any,
      { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE }
    )
      .addOperation(contract.call("get_log", nativeToScVal(logId, { type: "u64" })))
      .setTimeout(30)
      .build()
  );
  if (SorobanRpc.Api.isSimulationError(result)) throw new Error(result.error);
  const val = (result as SorobanRpc.Api.SimulateTransactionSuccessResponse).result?.retval;
  return scValToNative(val!) as ExecLog;
}

export async function logCount(): Promise<bigint> {
  const contract = new Contract(CONTRACT_ID);
  const result = await server.simulateTransaction(
    new TransactionBuilder(
      { accountId: () => CONTRACT_ID, sequenceNumber: () => "0", incrementSequenceNumber: () => {} } as any,
      { fee: BASE_FEE, networkPassphrase: NETWORK_PASSPHRASE }
    )
      .addOperation(contract.call("log_count"))
      .setTimeout(30)
      .build()
  );
  if (SorobanRpc.Api.isSimulationError(result)) throw new Error(result.error);
  const val = (result as SorobanRpc.Api.SimulateTransactionSuccessResponse).result?.retval;
  return scValToNative(val!) as bigint;
}
