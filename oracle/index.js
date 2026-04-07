import "dotenv/config";
import axios from "axios";
import {
  Contract,
  Keypair,
  Networks,
  SorobanRpc,
  TransactionBuilder,
  BASE_FEE,
  nativeToScVal,
} from "@stellar/stellar-sdk";

// ─── Config ───────────────────────────────────────────────────────────────────

const {
  ORACLE_SECRET,
  CONTRACT_ID,
  WALLET_ID = "0",
  RULE_IDS = "0",
  SIGNAL_URL,
  POLL_INTERVAL_MS = "30000",
  MAX_EXEC_PER_HOUR = "10",
  NETWORK_PASSPHRASE = "Test SDF Network ; September 2015",
  RPC_URL = "https://soroban-testnet.stellar.org",
} = process.env;

if (!ORACLE_SECRET || !CONTRACT_ID || !SIGNAL_URL) {
  console.error("Missing required env vars: ORACLE_SECRET, CONTRACT_ID, SIGNAL_URL");
  process.exit(1);
}

const keypair = Keypair.fromSecret(ORACLE_SECRET);
const server = new SorobanRpc.Server(RPC_URL);
const walletId = BigInt(WALLET_ID);
const ruleIds = RULE_IDS.split(",").map((r) => BigInt(r.trim()));
const pollInterval = parseInt(POLL_INTERVAL_MS);
const maxExecPerHour = parseInt(MAX_EXEC_PER_HOUR);

// ─── Rate limiter ─────────────────────────────────────────────────────────────

const execTimestamps: number[] = [];

function isRateLimited(): boolean {
  const now = Date.now();
  const windowStart = now - 3_600_000;
  // Remove old entries
  while (execTimestamps.length && execTimestamps[0] < windowStart) execTimestamps.shift();
  return execTimestamps.length >= maxExecPerHour;
}

function recordExec() {
  execTimestamps.push(Date.now());
}

// ─── Soroban invoke ───────────────────────────────────────────────────────────

async function executeRule(ruleId) {
  const account = await server.getAccount(keypair.publicKey());
  const contract = new Contract(CONTRACT_ID);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "execute_rule",
        nativeToScVal(walletId, { type: "u64" }),
        nativeToScVal(ruleId, { type: "u64" })
      )
    )
    .setTimeout(30)
    .build();

  const prepared = await server.prepareTransaction(tx);
  prepared.sign(keypair);
  const result = await server.sendTransaction(prepared);

  if (result.status === "ERROR") {
    throw new Error(`tx error: ${JSON.stringify(result.errorResult)}`);
  }

  // Poll for finality
  let response = await server.getTransaction(result.hash);
  while (response.status === "NOT_FOUND") {
    await new Promise((r) => setTimeout(r, 1000));
    response = await server.getTransaction(result.hash);
  }
  if (response.status !== "SUCCESS") throw new Error("tx failed");
  return result.hash;
}

// ─── Signal fetch ─────────────────────────────────────────────────────────────

async function fetchSignal(ruleId) {
  const { data } = await axios.get(SIGNAL_URL, {
    params: { wallet_id: WALLET_ID, rule_id: ruleId.toString() },
    timeout: 10_000,
  });
  return !!data?.signal;
}

// ─── Main loop ────────────────────────────────────────────────────────────────

async function poll() {
  console.log(`[${new Date().toISOString()}] Polling ${ruleIds.length} rule(s)…`);

  for (const ruleId of ruleIds) {
    try {
      const signal = await fetchSignal(ruleId);
      if (!signal) {
        console.log(`  rule ${ruleId}: no signal`);
        continue;
      }

      if (isRateLimited()) {
        console.warn(`  rule ${ruleId}: rate limit reached (${maxExecPerHour}/hr), skipping`);
        continue;
      }

      console.log(`  rule ${ruleId}: signal received, executing…`);
      const hash = await executeRule(ruleId);
      recordExec();
      console.log(`  rule ${ruleId}: ✅ executed tx=${hash}`);
    } catch (err) {
      console.error(`  rule ${ruleId}: ❌ ${err.message}`);
    }
  }
}

// Start
poll();
setInterval(poll, pollInterval);
