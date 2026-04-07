#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, log, symbol_short,
    vec, Address, Env, String, Symbol, Vec,
};

// ─── Types ────────────────────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, PartialEq)]
pub enum RuleType {
    TimeBased,
    ThresholdBased,
    ExternalSignal,
}

#[contracttype]
#[derive(Clone)]
pub struct Rule {
    pub rule_type: RuleType,
    pub target: Address,
    pub asset: String,
    pub amount: i128,
    pub active: bool,
    pub last_executed: u64,
    /// TimeBased: interval seconds | ThresholdBased: min balance | ExternalSignal: unused
    pub param: i128,
}

#[contracttype]
#[derive(Clone)]
pub struct Wallet {
    pub owner: Address,
    pub balance: i128,
    pub rules: Vec<Rule>,
    pub paused: bool,
    pub daily_spent: i128,
    pub daily_limit: i128,
    pub last_day: u64,
}

#[contracttype]
pub struct ExecutionLog {
    pub wallet_id: u64,
    pub rule_id: u64,
    pub timestamp: u64,
    pub amount: i128,
    pub target: Address,
}

// ─── Storage keys ─────────────────────────────────────────────────────────────

const AI_AGENT: Symbol = symbol_short!("AI_AGENT");
const LOG_SEQ: Symbol = symbol_short!("LOG_SEQ");
const DAILY_LIMIT_DEFAULT: i128 = 10_000_000_000;

// ─── Contract ─────────────────────────────────────────────────────────────────

#[contract]
pub struct LuminaAgent;

#[contractimpl]
impl LuminaAgent {
    // ── Admin ──────────────────────────────────────────────────────────────

    pub fn set_ai_agent(env: Env, caller: Address, agent: Address) {
        caller.require_auth();
        if env.storage().instance().has(&AI_AGENT) {
            panic!("agent already set");
        }
        env.storage().instance().set(&AI_AGENT, &agent);
    }

    // ── Wallet lifecycle ───────────────────────────────────────────────────

    pub fn init_wallet(env: Env, wallet_id: u64, owner: Address) -> Wallet {
        owner.require_auth();
        let key = (symbol_short!("WALLET"), wallet_id);
        if env.storage().persistent().has(&key) {
            panic!("wallet exists");
        }
        let wallet = Wallet {
            owner,
            balance: 0,
            rules: vec![&env],
            paused: false,
            daily_spent: 0,
            daily_limit: DAILY_LIMIT_DEFAULT,
            last_day: 0,
        };
        env.storage().persistent().set(&key, &wallet);
        wallet
    }

    pub fn deposit(env: Env, wallet_id: u64, amount: i128) {
        let key = (symbol_short!("WALLET"), wallet_id);
        let mut wallet: Wallet = env.storage().persistent().get(&key).expect("no wallet");
        wallet.owner.require_auth();
        wallet.balance += amount;
        env.storage().persistent().set(&key, &wallet);
    }

    pub fn set_daily_limit(env: Env, wallet_id: u64, limit: i128) {
        let key = (symbol_short!("WALLET"), wallet_id);
        let mut wallet: Wallet = env.storage().persistent().get(&key).expect("no wallet");
        wallet.owner.require_auth();
        wallet.daily_limit = limit;
        env.storage().persistent().set(&key, &wallet);
    }

    pub fn pause(env: Env, wallet_id: u64) {
        let key = (symbol_short!("WALLET"), wallet_id);
        let mut wallet: Wallet = env.storage().persistent().get(&key).expect("no wallet");
        wallet.owner.require_auth();
        wallet.paused = true;
        env.storage().persistent().set(&key, &wallet);
    }

    pub fn unpause(env: Env, wallet_id: u64) {
        let key = (symbol_short!("WALLET"), wallet_id);
        let mut wallet: Wallet = env.storage().persistent().get(&key).expect("no wallet");
        wallet.owner.require_auth();
        wallet.paused = false;
        env.storage().persistent().set(&key, &wallet);
    }

    // ── Rule management ────────────────────────────────────────────────────

    pub fn add_rule(env: Env, wallet_id: u64, rule: Rule) {
        let key = (symbol_short!("WALLET"), wallet_id);
        let mut wallet: Wallet = env.storage().persistent().get(&key).expect("no wallet");
        wallet.owner.require_auth();
        wallet.rules.push_back(rule);
        env.storage().persistent().set(&key, &wallet);
    }

    pub fn update_rule(env: Env, wallet_id: u64, rule_id: u64, rule: Rule) {
        let key = (symbol_short!("WALLET"), wallet_id);
        let mut wallet: Wallet = env.storage().persistent().get(&key).expect("no wallet");
        wallet.owner.require_auth();
        let idx = rule_id as u32;
        if idx >= wallet.rules.len() {
            panic!("rule not found");
        }
        wallet.rules.set(idx, rule);
        env.storage().persistent().set(&key, &wallet);
    }

    pub fn deactivate_rule(env: Env, wallet_id: u64, rule_id: u64) {
        let key = (symbol_short!("WALLET"), wallet_id);
        let mut wallet: Wallet = env.storage().persistent().get(&key).expect("no wallet");
        wallet.owner.require_auth();
        let idx = rule_id as u32;
        let mut rule: Rule = wallet.rules.get(idx).expect("rule not found");
        rule.active = false;
        wallet.rules.set(idx, rule);
        env.storage().persistent().set(&key, &wallet);
    }

    // ── Execution ──────────────────────────────────────────────────────────

    /// `executor` must be either the wallet owner or the registered AI agent.
    pub fn execute_rule(env: Env, executor: Address, wallet_id: u64, rule_id: u64) {
        executor.require_auth();
        let key = (symbol_short!("WALLET"), wallet_id);
        let mut wallet: Wallet = env.storage().persistent().get(&key).expect("no wallet");
        Self::check_executor(&env, &executor, &wallet);
        Self::run_rule(&env, &mut wallet, wallet_id, rule_id);
        env.storage().persistent().set(&key, &wallet);
    }

    pub fn execute_batch(env: Env, executor: Address, wallet_id: u64, rule_ids: Vec<u64>) {
        executor.require_auth();
        let key = (symbol_short!("WALLET"), wallet_id);
        let mut wallet: Wallet = env.storage().persistent().get(&key).expect("no wallet");
        Self::check_executor(&env, &executor, &wallet);
        for rule_id in rule_ids.iter() {
            Self::run_rule(&env, &mut wallet, wallet_id, rule_id);
        }
        env.storage().persistent().set(&key, &wallet);
    }

    // ── Queries ────────────────────────────────────────────────────────────

    pub fn get_wallet(env: Env, wallet_id: u64) -> Wallet {
        env.storage()
            .persistent()
            .get(&(symbol_short!("WALLET"), wallet_id))
            .expect("no wallet")
    }

    pub fn get_log(env: Env, log_id: u64) -> ExecutionLog {
        env.storage()
            .persistent()
            .get(&(symbol_short!("LOG"), log_id))
            .expect("log not found")
    }

    pub fn log_count(env: Env) -> u64 {
        env.storage().instance().get(&LOG_SEQ).unwrap_or(0u64)
    }

    // ── Internal helpers ───────────────────────────────────────────────────

    fn check_executor(env: &Env, executor: &Address, wallet: &Wallet) {
        if wallet.paused {
            panic!("wallet paused");
        }
        let is_owner = executor == &wallet.owner;
        let is_agent = env
            .storage()
            .instance()
            .get::<Symbol, Address>(&AI_AGENT)
            .map(|a| executor == &a)
            .unwrap_or(false);
        if !is_owner && !is_agent {
            panic!("unauthorized");
        }
    }

    fn run_rule(env: &Env, wallet: &mut Wallet, wallet_id: u64, rule_id: u64) {
        let idx = rule_id as u32;
        let mut rule: Rule = wallet.rules.get(idx).expect("rule not found");

        if !rule.active {
            panic!("rule inactive");
        }

        let now = env.ledger().timestamp();

        match rule.rule_type {
            RuleType::TimeBased => {
                let interval = rule.param as u64;
                if now < rule.last_executed + interval {
                    panic!("too soon");
                }
            }
            RuleType::ThresholdBased => {
                if wallet.balance < rule.param {
                    panic!("threshold not met");
                }
            }
            RuleType::ExternalSignal => {}
        }

        let today = env.ledger().timestamp() / 86_400;
        if today != wallet.last_day {
            wallet.daily_spent = 0;
            wallet.last_day = today;
        }
        if wallet.daily_spent + rule.amount > wallet.daily_limit {
            panic!("daily limit exceeded");
        }
        if wallet.balance < rule.amount {
            panic!("insufficient balance");
        }

        wallet.balance -= rule.amount;
        wallet.daily_spent += rule.amount;
        rule.last_executed = now;
        wallet.rules.set(idx, rule.clone());

        let seq: u64 = env.storage().instance().get(&LOG_SEQ).unwrap_or(0);
        env.storage().persistent().set(
            &(symbol_short!("LOG"), seq),
            &ExecutionLog {
                wallet_id,
                rule_id,
                timestamp: now,
                amount: rule.amount,
                target: rule.target.clone(),
            },
        );
        env.storage().instance().set(&LOG_SEQ, &(seq + 1));

        log!(env, "executed rule {} wallet {} amount {}", rule_id, wallet_id, rule.amount);
        env.events().publish(
            (symbol_short!("exec"), wallet_id, rule_id),
            (rule.amount, rule.target),
        );
    }
}

// ─── Tests ────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::{Address as _, Ledger}, Env, String};

    fn setup() -> (Env, Address, Address, LuminaAgentClient<'static>) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(LuminaAgent, ());
        let client = LuminaAgentClient::new(&env, &contract_id);
        let owner = Address::generate(&env);
        let target = Address::generate(&env);
        (env, owner, target, client)
    }

    fn make_rule(env: &Env, target: Address, rule_type: RuleType, param: i128) -> Rule {
        Rule {
            rule_type,
            target,
            asset: String::from_str(env, "XLM"),
            amount: 100,
            active: true,
            last_executed: 0,
            param,
        }
    }

    #[test]
    fn test_init_and_deposit() {
        let (env, owner, _, client) = setup();
        client.init_wallet(&0, &owner);
        client.deposit(&0, &500);
        assert_eq!(client.get_wallet(&0).balance, 500);
    }

    #[test]
    fn test_add_and_execute_time_based() {
        let (env, owner, target, client) = setup();
        client.init_wallet(&0, &owner);
        client.deposit(&0, &1000);
        env.ledger().with_mut(|l| l.timestamp = 1000);
        client.add_rule(&0, &make_rule(&env, target.clone(), RuleType::TimeBased, 500));
        env.ledger().with_mut(|l| l.timestamp = 1600);
        client.execute_rule(&owner, &0, &0);
        assert_eq!(client.get_wallet(&0).balance, 900);
        assert_eq!(client.log_count(), 1);
    }

    #[test]
    #[should_panic(expected = "too soon")]
    fn test_time_based_too_soon() {
        let (env, owner, target, client) = setup();
        client.init_wallet(&0, &owner);
        client.deposit(&0, &1000);
        // Add rule at t=1000, execute once (last_executed becomes 1000)
        env.ledger().with_mut(|l| l.timestamp = 1000);
        client.add_rule(&0, &make_rule(&env, target, RuleType::TimeBased, 500));
        env.ledger().with_mut(|l| l.timestamp = 1600);
        client.execute_rule(&owner, &0, &0); // ok: 1600 >= 1000+500
        // Try again at t=1700 — only 100s since last exec, interval=500 → should panic
        env.ledger().with_mut(|l| l.timestamp = 1700);
        client.execute_rule(&owner, &0, &0);
    }

    #[test]
    fn test_threshold_based() {
        let (env, owner, target, client) = setup();
        client.init_wallet(&0, &owner);
        client.deposit(&0, &1000);
        client.add_rule(&0, &make_rule(&env, target, RuleType::ThresholdBased, 500));
        client.execute_rule(&owner, &0, &0);
        assert_eq!(client.get_wallet(&0).balance, 900);
    }

    #[test]
    #[should_panic(expected = "threshold not met")]
    fn test_threshold_not_met() {
        let (env, owner, target, client) = setup();
        client.init_wallet(&0, &owner);
        client.deposit(&0, &200);
        client.add_rule(&0, &make_rule(&env, target, RuleType::ThresholdBased, 500));
        client.execute_rule(&owner, &0, &0);
    }

    #[test]
    fn test_deactivate_rule() {
        let (env, owner, target, client) = setup();
        client.init_wallet(&0, &owner);
        client.add_rule(&0, &make_rule(&env, target, RuleType::ThresholdBased, 0));
        client.deactivate_rule(&0, &0);
        assert!(!client.get_wallet(&0).rules.get(0).unwrap().active);
    }

    #[test]
    #[should_panic(expected = "rule inactive")]
    fn test_execute_inactive_rule() {
        let (env, owner, target, client) = setup();
        client.init_wallet(&0, &owner);
        client.deposit(&0, &1000);
        client.add_rule(&0, &make_rule(&env, target, RuleType::ThresholdBased, 0));
        client.deactivate_rule(&0, &0);
        client.execute_rule(&owner, &0, &0);
    }

    #[test]
    fn test_execute_batch() {
        let (env, owner, target, client) = setup();
        client.init_wallet(&0, &owner);
        client.deposit(&0, &1000);
        client.add_rule(&0, &make_rule(&env, target.clone(), RuleType::ThresholdBased, 0));
        client.add_rule(&0, &make_rule(&env, target, RuleType::ThresholdBased, 0));
        client.execute_batch(&owner, &0, &vec![&env, 0u64, 1u64]);
        assert_eq!(client.get_wallet(&0).balance, 800);
    }

    #[test]
    #[should_panic(expected = "daily limit exceeded")]
    fn test_daily_limit() {
        let (env, owner, target, client) = setup();
        client.init_wallet(&0, &owner);
        client.deposit(&0, &100_000_000_000);
        client.set_daily_limit(&0, &150);
        client.add_rule(&0, &make_rule(&env, target.clone(), RuleType::ThresholdBased, 0));
        client.add_rule(&0, &make_rule(&env, target, RuleType::ThresholdBased, 0));
        client.execute_batch(&owner, &0, &vec![&env, 0u64, 1u64]);
    }

    #[test]
    #[should_panic(expected = "wallet paused")]
    fn test_pause() {
        let (env, owner, target, client) = setup();
        client.init_wallet(&0, &owner);
        client.deposit(&0, &1000);
        client.add_rule(&0, &make_rule(&env, target, RuleType::ThresholdBased, 0));
        client.pause(&0);
        client.execute_rule(&owner, &0, &0);
    }

    #[test]
    fn test_update_rule() {
        let (env, owner, target, client) = setup();
        client.init_wallet(&0, &owner);
        client.deposit(&0, &1000);
        client.add_rule(&0, &make_rule(&env, target.clone(), RuleType::ThresholdBased, 0));
        let mut updated = make_rule(&env, target, RuleType::ThresholdBased, 0);
        updated.amount = 200;
        client.update_rule(&0, &0, &updated);
        client.execute_rule(&owner, &0, &0);
        assert_eq!(client.get_wallet(&0).balance, 800);
    }

    #[test]
    fn test_ai_agent_can_execute() {
        let (env, owner, target, client) = setup();
        let agent = Address::generate(&env);
        client.init_wallet(&0, &owner);
        client.deposit(&0, &1000);
        client.add_rule(&0, &make_rule(&env, target, RuleType::ThresholdBased, 0));
        client.set_ai_agent(&owner, &agent);
        client.execute_rule(&agent, &0, &0);
        assert_eq!(client.get_wallet(&0).balance, 900);
    }
}
