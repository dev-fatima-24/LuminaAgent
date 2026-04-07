# LuminaAgent

LuminaAgent is a decentralized AI-powered wallet built on the Stellar blockchain using Soroban smart contracts. It allows users to define automated rules for payments, transfers, and AI-triggered actions while keeping funds secure and fully auditable on-chain.

---

## Features

- Autonomous Wallet: Execute payments and transfers automatically based on user-defined rules.
- Rule Types:
  - Time-Based: Recurring payments or transfers.
  - Threshold-Based: Trigger actions when balances meet certain criteria.
  - External Signal: Execute actions based on AI or oracle inputs.
- Multi-Asset Support: Works with XLM and custom Stellar tokens.
- Auditability: All executions are logged on-chain for transparency.
- Security-Focused: Access control, fail-safes, and multi-signature support.
- Frontend Dashboard: View wallet balance, manage rules, and execute actions manually.
- AI/Oracle Integration: Automate decisions using external AI signals.
- Docker-Ready: Easy development, testing, and deployment environment.

---

## Tech Stack

- Smart Contracts: Rust + Soroban SDK
- Frontend: React + TypeScript + Soroban JS SDK
- AI/Oracle: Node.js + JavaScript
- DevOps: Docker for development and testing
- Blockchain: Stellar Devnet / Soroban smart contracts

---

## Project Structure
LuminaAgent/
├── contracts/ # Soroban Rust smart contracts
├── frontend/ # React/TypeScript frontend dashboard
├── oracle/ # AI/Oracle integration scripts
├── scripts/ # Deployment and rule execution scripts
├── docker/ # Dockerfile and docker-compose setup
└── README.md


---

## Getting Started

### 1. Clone Repository
```bash
git clone https://github.com/yourusername/LuminaAgent.git
cd LuminaAgent
2. Smart Contract Setup
cd contracts
cargo build
cargo test
3. Frontend Setup
cd frontend
npm install
npm start
4. Oracle / AI Integration
cd oracle
npm install
node index.js
5. Docker Setup (Optional)
docker build -t luminaagent .
docker run -p 3000:3000 luminaagent
