import React from "react";
import { Rule } from "../soroban";

interface Props {
  rules: Rule[];
  onExecute: (id: number) => void;
  onDeactivate: (id: number) => void;
}

export default function RuleList({ rules, onExecute, onDeactivate }: Props) {
  if (!rules.length) return <p>No rules yet.</p>;
  return (
    <table border={1} cellPadding={6} style={{ borderCollapse: "collapse", width: "100%" }}>
      <thead>
        <tr>
          <th>#</th><th>Type</th><th>Target</th><th>Asset</th>
          <th>Amount</th><th>Param</th><th>Active</th><th>Last Exec</th><th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {rules.map((r, i) => (
          <tr key={i}>
            <td>{i}</td>
            <td>{r.rule_type}</td>
            <td style={{ fontFamily: "monospace", fontSize: 11 }}>{r.target}</td>
            <td>{r.asset}</td>
            <td>{r.amount.toString()}</td>
            <td>{r.param.toString()}</td>
            <td>{r.active ? "✅" : "❌"}</td>
            <td>{r.last_executed.toString()}</td>
            <td>
              <button disabled={!r.active} onClick={() => onExecute(i)}>Run</button>{" "}
              <button disabled={!r.active} onClick={() => onDeactivate(i)}>Deactivate</button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
