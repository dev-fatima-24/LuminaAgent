import React, { useCallback, useEffect, useState } from "react";
import { Keypair } from "@stellar/stellar-sdk";
import {
  addRule,
  deactivateRule,
  executeRule,
  ExecLog,
  getLog,
  getWallet,
  logCount,
  Rule,
  Wallet,
} from "./soroban";
import RuleForm from "./components/RuleForm";
import RuleList from "./components/RuleList";
import LogViewer from "./components/LogViewer";

const WALLET_ID = 0n;

export default function App() {
  const [secretKey, setSecretKey] = useState("");
  const [keypair, setKeypair] = useState<Keypair | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [logs, setLogs] = useState<ExecLog[]>([]);
  const [status, setStatus] = useState("");

  const connect = () => {
    try {
      const kp = Keypair.fromSecret(secretKey.trim());
      setKeypair(kp);
      setStatus(`Connected: ${kp.publicKey()}`);
    } catch {
      setStatus("Invalid secret key");
    }
  };

  const refresh = useCallback(async () => {
    if (!keypair) return;
    try {
      const w = await getWallet(WALLET_ID);
      setWallet(w);
      const count = await logCount();
      const fetched: ExecLog[] = [];
      for (let i = 0n; i < count; i++) fetched.push(await getLog(i));
      setLogs(fetched);
    } catch (e: any) {
      setStatus(e.message);
    }
  }, [keypair]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleAddRule = async (rule: Rule) => {
    if (!keypair) return;
    try {
      setStatus("Adding rule…");
      await addRule(keypair, WALLET_ID, rule);
      setStatus("Rule added.");
      await refresh();
    } catch (e: any) { setStatus(e.message); }
  };

  const handleExecute = async (ruleId: number) => {
    if (!keypair) return;
    try {
      setStatus(`Executing rule ${ruleId}…`);
      await executeRule(keypair, WALLET_ID, BigInt(ruleId));
      setStatus("Executed.");
      await refresh();
    } catch (e: any) { setStatus(e.message); }
  };

  const handleDeactivate = async (ruleId: number) => {
    if (!keypair) return;
    try {
      setStatus(`Deactivating rule ${ruleId}…`);
      await deactivateRule(keypair, WALLET_ID, BigInt(ruleId));
      setStatus("Deactivated.");
      await refresh();
    } catch (e: any) { setStatus(e.message); }
  };

  return (
    <div style={{ fontFamily: "sans-serif", padding: 24, maxWidth: 900, margin: "0 auto" }}>
      <h1>🌟 LuminaAgent</h1>

      {/* Wallet connect */}
      <section>
        <h2>Connect Wallet</h2>
        <input
          type="password"
          placeholder="Stellar secret key (S…)"
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          style={{ width: 360 }}
        />
        <button onClick={connect} style={{ marginLeft: 8 }}>Connect</button>
      </section>

      {status && <p style={{ color: "gray" }}>{status}</p>}

      {keypair && (
        <>
          {/* Wallet info */}
          <section>
            <h2>Wallet</h2>
            {wallet ? (
              <ul>
                <li>Owner: <code>{wallet.owner}</code></li>
                <li>Balance: {wallet.balance.toString()} stroops</li>
                <li>Paused: {wallet.paused ? "Yes ⚠️" : "No"}</li>
                <li>Daily limit: {wallet.daily_limit.toString()} | Spent today: {wallet.daily_spent.toString()}</li>
              </ul>
            ) : (
              <p>Loading…</p>
            )}
            <button onClick={refresh}>Refresh</button>
          </section>

          {/* Rules */}
          <section>
            <h2>Rules</h2>
            <RuleList
              rules={wallet?.rules ?? []}
              onExecute={handleExecute}
              onDeactivate={handleDeactivate}
            />
            <RuleForm onAdd={handleAddRule} />
          </section>

          {/* Logs */}
          <section>
            <h2>Execution Logs</h2>
            <LogViewer logs={logs} />
          </section>
        </>
      )}
    </div>
  );
}
