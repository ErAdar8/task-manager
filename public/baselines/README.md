# Smart Contract Security Baseline Database

**Version:** 2.0.0  
**Last Updated:** 2025-02-20  
**Total Contracts:** 67

---

## Overview

This database contains 67 production-grade smart contract security patterns used for baseline comparison in the Bounty Hunter pre-analysis system. Each contract represents either a **safe implementation** or a **known vulnerability** with complete documentation.

### Purpose
- **Pre-Analysis:** Compare uploaded contracts against known patterns
- **Detection:** Identify deviations from safe implementations
- **Education:** Learn from real vulnerabilities and safe alternatives
- **Baseline Matching:** Calculate similarity scores to reduce false positives

---

## Directory Structure

```
public/baselines/
├── metadata.json          (Complete index with 67 entries)
├── README.md              (This file)
├── solidity/
│   ├── security/          (8 contracts)
│   ├── tokens/            (6 contracts)
│   ├── math/              (3 contracts)
│   ├── gas/               (3 contracts)
│   ├── defi/              (12 contracts)
│   ├── bridge/            (3 contracts)
│   ├── upgrades/          (5 contracts)
│   ├── advanced/          (6 contracts)
│   └── exploits/          (8 contracts)
└── rust/
    ├── anchor/            (7 contracts)
    └── substrate/         (6 contracts)
```

---

## Categories

### Solidity Contracts (54 total)

#### Security (01-08)
Core security patterns including reentrancy protection, access control, and external call safety.

| # | File | Type | Description |
|---|------|------|-------------|
| 01 | `01-reentrancy-safe.sol` | Safe | Checks-Effects-Interactions pattern |
| 02 | `02-reentrancy-vulnerable.sol` | Vulnerable | The DAO-style reentrancy bug |
| 03 | `03-access-control-ownable.sol` | Safe | OpenZeppelin Ownable pattern |
| 04 | `04-access-control-missing.sol` | Vulnerable | Missing access control on admin functions |
| 05 | `05-external-call-safe.sol` | Safe | Safe external call handling |
| 06 | `06-pausable-pattern.sol` | Safe | Emergency pause functionality |
| 07 | `07-pull-payment-safe.sol` | Safe | Pull-over-push payment pattern |
| 08 | `08-multisig-wallet.sol` | Safe | Multi-signature wallet security |

#### Tokens (09-14)
ERC20/ERC721 implementations and token interaction patterns.

| # | File | Type | Description |
|---|------|------|-------------|
| 09 | `09-erc20-safe.sol` | Safe | Secure ERC20 implementation |
| 10 | `10-erc20-unsafe-approval.sol` | Vulnerable | Approval race condition |
| 11 | `11-erc721-safe.sol` | Safe | Secure ERC721 implementation |
| 12 | `12-erc20-mintable-safe.sol` | Safe | Secure mintable token |
| 13 | `13-erc20-fee-on-transfer.sol` | Educational | Fee-on-transfer token handling |
| 14 | `14-erc20-unchecked-transfer.sol` | Vulnerable | Unchecked transfer return value |

#### Math (15-17)
Integer safety and arithmetic patterns.

| # | File | Type | Description |
|---|------|------|-------------|
| 15 | `15-safe-math-08.sol` | Safe | Solidity 0.8+ overflow protection |
| 16 | `16-unsafe-math-07.sol` | Vulnerable | Pre-0.8 integer overflow |
| 17 | `17-unchecked-block.sol` | Educational | Unchecked arithmetic blocks |

#### Gas Optimization & DoS (18-20)
Gas-related vulnerabilities and optimizations.

| # | File | Type | Description |
|---|------|------|-------------|
| 18 | `18-dos-unbounded-loop.sol` | Vulnerable | DoS via unbounded iteration |
| 19 | `19-efficient-storage.sol` | Safe | Gas-efficient storage patterns |
| 20 | `20-revert-griefing.sol` | Vulnerable | DoS via revert griefing |

#### DeFi (21-28, 61-64)
DeFi protocol patterns and ERC4626 vault security.

| # | File | Type | Description |
|---|------|------|-------------|
| 21 | `21-staking-basic.sol` | Safe | Basic staking contract |
| 22 | `22-liquidity-pool-amm.sol` | Safe | AMM liquidity pool |
| 23 | `23-vault-erc4626.sol` | Safe | ERC4626 tokenized vault |
| 24 | `24-flashloan-safe.sol` | Safe | Flash loan with reentrancy guard |
| 25 | `25-yield-farming.sol` | Safe | Yield farming contract |
| 26 | `26-governance-voting.sol` | Safe | On-chain governance |
| 27 | `27-timelock-controller.sol` | Safe | Timelock for governance |
| 28 | `28-oracle-price-feed.sol` | Safe | Oracle integration |
| 61 | `61-vault-inflation-attack.sol` | Vulnerable | ERC4626 inflation attack |
| 62 | `62-vault-donation-attack.sol` | Vulnerable | Vault donation attack |
| 63 | `63-vault-share-manipulation.sol` | Vulnerable | Share price manipulation |
| 64 | `64-vault-rounding-exploit.sol` | Vulnerable | Rounding error exploit |

#### Bridge (65-67)
Cross-chain messaging and verification patterns.

| # | File | Type | Description |
|---|------|------|-------------|
| 65 | `65-message-verification.sol` | Safe | Cross-chain message verification |
| 66 | `66-replay-protection.sol` | Safe | Replay attack prevention |
| 67 | `67-domain-separation.sol` | Safe | EIP-712 domain separation |

#### Upgrades (29-33)
Proxy patterns and upgradeability.

| # | File | Type | Description |
|---|------|------|-------------|
| 29 | `29-proxy-transparent.sol` | Safe | Transparent proxy pattern |
| 30 | `30-proxy-uups.sol` | Safe | UUPS upgradeable proxy |
| 31 | `31-beacon-proxy.sol` | Safe | Beacon proxy pattern |
| 32 | `32-initializer-pattern.sol` | Safe | Proper initializer usage |
| 33 | `33-storage-collision-bug.sol` | Vulnerable | Storage slot collision |

#### Advanced (34-39)
Advanced cryptographic and security patterns.

| # | File | Type | Description |
|---|------|------|-------------|
| 34 | `34-signature-verification.sol` | Safe | ECDSA signature verification |
| 35 | `35-eip712-permit.sol` | Safe | EIP-712 typed data signing |
| 36 | `36-merkle-proof-whitelist.sol` | Safe | Merkle tree whitelist |
| 37 | `37-commit-reveal-scheme.sol` | Safe | Commit-reveal for fairness |
| 38 | `38-slippage-protection.sol` | Safe | DEX slippage protection |
| 39 | `39-meta-transaction.sol` | Safe | Gasless meta-transactions |

#### Exploits (40-47)
Historical exploits and attack patterns for education.

| # | File | Type | Description |
|---|------|------|-------------|
| 40 | `40-dao-hack-reentrancy.sol` | Vulnerable | The DAO 2016 attack |
| 41 | `41-integer-overflow-attack.sol` | Vulnerable | BeautyChain-style overflow |
| 42 | `42-delegatecall-exploit.sol` | Vulnerable | Parity wallet hack |
| 43 | `43-tx-origin-phishing.sol` | Vulnerable | tx.origin phishing |
| 44 | `44-timestamp-manipulation.sol` | Vulnerable | Block timestamp gaming |
| 45 | `45-selfdestruct-force-ether.sol` | Vulnerable | Forced ether via selfdestruct |
| 46 | `46-approval-race-condition.sol` | Vulnerable | ERC20 approval race |
| 47 | `47-front-running-vulnerable.sol` | Vulnerable | Front-running susceptible |

---

### Rust Contracts (13 total)

#### Anchor/Solana (48-54)
Solana program security patterns using Anchor framework.

| # | File | Type | Description |
|---|------|------|-------------|
| 48 | `48-authority-check-safe.rs` | Safe | Proper authority validation |
| 49 | `49-pda-validation.rs` | Safe | PDA derivation and validation |
| 50 | `50-cpi-reentrancy-safe.rs` | Safe | CPI with state-before-call |
| 51 | `51-unsigned-math-safe.rs` | Safe | Checked arithmetic in Rust |
| 52 | `52-unsigned-math-vulnerable.rs` | Vulnerable | Unchecked arithmetic overflow |
| 53 | `53-missing-signer-check.rs` | Vulnerable | Missing signer constraint |
| 54 | `54-account-validation.rs` | Safe | Account ownership validation |

#### Substrate (55-60)
Substrate pallet security patterns.

| # | File | Type | Description |
|---|------|------|-------------|
| 55 | `55-pallet-basic.rs` | Safe | Basic pallet structure |
| 56 | `56-weight-calculation.rs` | Safe | Proper weight calculation |
| 57 | `57-runtime-upgrade-safe.rs` | Safe | Safe runtime upgrades |
| 58 | `58-storage-migration.rs` | Safe | Storage migration handling |
| 59 | `59-origin-verification.rs` | Safe | Origin verification patterns |
| 60 | `60-balance-transfer-safe.rs` | Safe | Safe balance transfers |

---

## Usage

### Pre-Scan Integration

The baseline database is used by the pre-scan system in four layers:

1. **Regex Pattern Matching** - 16+ vulnerability patterns
2. **Slither Static Analysis** - 80+ detectors (if installed)
3. **Baseline Comparison** - Compare against 67 reference contracts
4. **Context-Aware Checks** - CEI verification, access control analysis

### metadata.json Structure

Each contract entry includes:

```json
{
  "id": "01",
  "number": 1,
  "filename": "01-reentrancy-safe.sol",
  "name": "Reentrancy Safe",
  "lang": "solidity",
  "category": "security",
  "subcategory": "reentrancy",
  "tier": "core",
  "label": "safe",
  "safe_score": 100,
  "immunefi_level": null,
  "bug_type": null,
  "key_patterns": ["checks-effects-interactions"],
  "keywords": ["reentrancy", "withdraw", "balance"],
  "what_to_check": ["State updated before .call"],
  "tags": ["fundamental", "required"],
  "file_path": "public/baselines/solidity/security/01-reentrancy-safe.sol"
}
```

### API Usage

```typescript
import { compareToBaseline } from '@/lib/tools/baseline-comparator';
import { matchSafePatterns } from '@/lib/tools/safe-patterns';

// Compare contract against reentrancy baseline
const result = await compareToBaseline(contractCode, 'contract.sol', 'reentrancy');
console.log(result.matches_safe_pattern); // true/false
console.log(result.similarity_score);      // 0-100

// Match against known safe patterns
const patterns = matchSafePatterns(contractCode);
console.log(patterns.matched);  // Array of matched SafePattern
console.log(patterns.coverage); // Percentage coverage
```

---

## Statistics

| Category | Safe | Vulnerable | Educational | Total |
|----------|------|------------|-------------|-------|
| Security | 6 | 2 | 0 | 8 |
| Tokens | 3 | 2 | 1 | 6 |
| Math | 1 | 1 | 1 | 3 |
| Gas | 1 | 2 | 0 | 3 |
| DeFi | 8 | 4 | 0 | 12 |
| Bridge | 3 | 0 | 0 | 3 |
| Upgrades | 4 | 1 | 0 | 5 |
| Advanced | 6 | 0 | 0 | 6 |
| Exploits | 0 | 8 | 0 | 8 |
| Anchor | 5 | 2 | 0 | 7 |
| Substrate | 6 | 0 | 0 | 6 |
| **Total** | **43** | **22** | **2** | **67** |

---

## Contributing

To add a new baseline contract:

1. Create the contract file in the appropriate category directory
2. Follow the naming convention: `NN-description.sol` or `NN-description.rs`
3. Add complete metadata to `metadata.json`
4. Include inline documentation with:
   - `@title` and `@notice` NatSpec comments
   - `METADATA:` comment block
   - `KEY PATTERN` or `VULNERABILITY` markers
5. Test that the pre-scan correctly identifies the pattern

---

## License

These baseline contracts are for educational and security research purposes.
Some contracts are based on OpenZeppelin implementations (MIT License).
Historical exploit reproductions are for educational purposes only.

---

## Version History

- **2.0.0** (2025-02-20) - Complete 67-contract database with metadata
- **1.0.0** (2025-02-18) - Initial 4 baseline contracts
