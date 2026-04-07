import React from "react";
import { ExecLog } from "../soroban";

interface Props {
  logs: ExecLog[];
}

export default function LogViewer({ logs }: Props) {
  if (!logs.length) return <p>No execution logs.</p>;
  return (
    <table border={1} cellPadding={6} style={{ borderCollapse: "collapse", width: "100%" }}>
      <thead>
        <tr><th>Log #</th><th>Wallet</th><th>Rule</th><th>Amount</th><th>Target</th><th>Timestamp</th></tr>
      </thead>
      <tbody>
        {logs.map((l, i) => (
          <tr key={i}>
            <td>{i}</td>
            <td>{l.wallet_id.toString()}</td>
            <td>{l.rule_id.toString()}</td>
            <td>{l.amount.toString()}</td>
            <td style={{ fontFamily: "monospace", fontSize: 11 }}>{l.target}</td>
            <td>{new Date(Number(l.timestamp) * 1000).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
