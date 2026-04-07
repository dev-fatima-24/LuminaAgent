import React, { useState } from "react";
import { Rule } from "../soroban";

interface Props {
  onAdd: (rule: Rule) => void;
}

const EMPTY: Rule = {
  rule_type: "ThresholdBased",
  target: "",
  asset: "XLM",
  amount: 0n,
  active: true,
  last_executed: 0n,
  param: 0n,
};

export default function RuleForm({ onAdd }: Props) {
  const [rule, setRule] = useState<Rule>(EMPTY);

  const set = (k: keyof Rule, v: string) =>
    setRule((r) => ({
      ...r,
      [k]: ["amount", "param", "last_executed"].includes(k) ? BigInt(v || 0) : v,
    }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onAdd(rule);
    setRule(EMPTY);
  };

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 400 }}>
      <h3>Add Rule</h3>
      <select value={rule.rule_type} onChange={(e) => set("rule_type", e.target.value)}>
        <option value="TimeBased">Time-Based</option>
        <option value="ThresholdBased">Threshold-Based</option>
        <option value="ExternalSignal">External Signal</option>
      </select>
      <input placeholder="Target address" value={rule.target} onChange={(e) => set("target", e.target.value)} required />
      <input placeholder="Asset (e.g. XLM)" value={rule.asset} onChange={(e) => set("asset", e.target.value)} required />
      <input type="number" placeholder="Amount (stroops)" value={rule.amount.toString()} onChange={(e) => set("amount", e.target.value)} required />
      <input
        type="number"
        placeholder={rule.rule_type === "TimeBased" ? "Interval (seconds)" : "Min balance trigger"}
        value={rule.param.toString()}
        onChange={(e) => set("param", e.target.value)}
      />
      <button type="submit">Add Rule</button>
    </form>
  );
}
