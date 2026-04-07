# LuminaAgent

A decentralized AI-powered wallet on the Stellar blockchain using Soroban smart contracts. Define automated rules for payments and transfers — time-based, threshold-based, or AI-triggered — with full on-chain auditability.

---

## Project Structure

```
LuminaAgent/
├── contracts/          # Soroban Rust smart contract
│   ├── Cargo.toml
│   └── src/lib.rs
├── frontend/           # React + TypeScript dashboard
│   ├── public/
│   └── src/
│       ├── App.tsx
│       ├── soroban.ts
│       ├── config.ts
│       └── components/
│           ├── RuleForm.tsx
│           ├── RuleList.tsx
│           └── LogViewer.tsx
├── oracle/             # AI/Oracle Node.js integration
│   ├── index.js
│   └── .env.example
├── scripts/            # TypeScript deployment & management scripts
│   ├── deploy.ts
│   ├── init-wallet.ts
│   ├── add-rules.ts
│   ├── execute-rules.ts
│   ├── fetch-logs.ts
│   └── helpers.ts
├── docker/             # Docker setup
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── .env.example
└── README.md
```

---

## Smart Contract

### Data Model

```
Wallet { owner, balance, rules[], paused, daily_spent, daily_limit, last_day }
Rule   { rule_type, target, asset, amount, active, last_executed, param }
```

`param` meaning by rule type:
- `TimeBased` → interval in seconds between executions
- `ThresholdBased` → minimum wallet balance required to trigger
- `ExternalSignal` → unused (AI agent is responsible for signal verification)

### Functions

| Function | Description |
|---|---|
| `init_wallet(wallet_id, owner)` | Create a new wallet |
| `deposit(wallet_id, amount)` | Add balance |
| `add_rule(wallet_id, rule)` | Append a rule |
| `update_rule(wallet_id, rule_id, rule)` | Replace a rule |
| `deactivate_rule(wallet_id, rule_id)` | Disable a rule |
| `execute_rule(wallet_id, rule_id)` | Execute a single rule |
| `execute_batch(wallet_id, rule_ids)` | Execute multiple rules |
| `pause(wallet_id)` / `unpause(wallet_id)` | Fail-safe pause |
| `set_daily_limit(wallet_id, limit)` | Set daily spend cap |
| `set_ai_agent(agent)` | Register AI oracle address |
| `get_wallet(wallet_id)` | Read wallet state |
| `get_log(log_id)` / `log_count()` | Read execution logs |

### Security Features
- Only wallet owner or registered AI agent can execute rules
- Daily transaction limit with automatic reset
- Wallet pause/unpause fail-safe
- Prevents execution of inactive rules
- On-chain event emission + persistent log for every execution

---

## Getting Started

### 1. Smart Contract

```bash
cd contracts
cargo build --target wasm32-unknown-unknown --release
cargo test
```

### 2. Deploy to Devnet

```bash
cd scripts
cp .env.example .env
# Fill in DEPLOYER_SECRET, then:
npm install
npm run deploy       # uploads WASM, deploys contract → prints CONTRACT_ID
# Add CONTRACT_ID to .env, then:
npm run init         # initializes wallet
npm run add-rules    # adds sample rules
npm run execute      # executes rules
npm run logs         # prints execution logs
```

### 3. Frontend

```bash
cd frontend
cp .env.example .env   # set REACT_APP_CONTRACT_ID
npm install
npm start              # http://localhost:3000
```

### 4. Oracle

```bash
cd oracle
cp .env.example .env   # set ORACLE_SECRET, CONTRACT_ID, SIGNAL_URL
npm install
npm start
```

### 5. Docker (all-in-one)

```bash
cd docker
cp .env.example .env   # fill in secrets
docker compose up --build
```

- Frontend served at `http://localhost:3000`
- Oracle runs as a separate service polling your AI signal endpoint

---

## Environment Variables

### scripts/.env

| Variable | Description |
|---|---|
| `DEPLOYER_SECRET` | Stellar secret key for deployment |
| `CONTRACT_ID` | Deployed contract address |
| `WALLET_ID` | Wallet ID to operate on (default: 0) |
| `WASM_PATH` | Path to compiled `.wasm` file |
| `RPC_URL` | Soroban RPC endpoint |
| `NETWORK_PASSPHRASE` | Stellar network passphrase |

### oracle/.env

| Variable | Description |
|---|---|
| `ORACLE_SECRET` | AI agent Stellar secret key |
| `CONTRACT_ID` | Deployed contract address |
| `SIGNAL_URL` | AI API endpoint returning `{ signal: bool }` |
| `RULE_IDS` | Comma-separated rule IDs to monitor |
| `POLL_INTERVAL_MS` | Polling interval (default: 30000) |
| `MAX_EXEC_PER_HOUR` | Rate limit per hour (default: 10) |

---

## Running Tests

```bash
cd contracts
cargo test
```

Tests cover: init, deposit, time-based execution, threshold execution, deactivation, batch execution, daily limit, pause, and update rule.
