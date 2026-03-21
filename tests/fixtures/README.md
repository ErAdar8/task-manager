# Bounty Hunter Test Suite — Fixtures & Expected Results

This directory contains **test contracts** used to validate the bounty hunter analyzer (anti-hallucination, exact line numbers, code snippets, and confidence scoring).

## Directory structure

```
tests/
  fixtures/
    README.md                    (this file)
    contracts/
      solidity/
        reentrancy_vulnerable.sol
        access_control_missing.sol
        dos_unbounded_loop.sol
        delegatecall_unsafe.sol
        integer_overflow_unchecked.sol
        safe_reentrancy_fixed.sol   (negative test — no vuln)
      rust/
        anchor_unsigned_math.rs
        anchor_missing_access_control.rs
```

## How to use

1. **Upload** each contract (or combine several) into a session in **Bounty** mode.
2. **Run analysis** and verify the analyzer output:
   - Every reported vulnerability has an **exact line number** (within file line count).
   - **Code snippet** matches the actual line character-for-character.
   - **Proof of concept** is concrete (steps, values, or attacker contract).
   - Low-confidence items appear under `suspicious_patterns_requiring_investigation`, not as vulnerabilities.
3. **Negative test:** `safe_reentrancy_fixed.sol` should **not** be reported as reentrancy (state update before external call).

## Expected vulnerabilities (Solidity)

| File | Expected finding | Approx. line | Notes |
|------|------------------|--------------|--------|
| `reentrancy_vulnerable.sol` | Reentrancy (call before state update) | 16 (external call), 18 (state update) | Classic CEI violation. |
| `access_control_missing.sol` | Missing access control | 18 (`setOwner`), 24 (`withdrawAll`) | No `onlyOwner` or role check. |
| `dos_unbounded_loop.sol` | DoS / unbounded loop | 26 (`for` loop over `payees.length`) | Gas exhaustion if `payees` is large. |
| `delegatecall_unsafe.sol` | Unsafe delegatecall | 20 (`implementation.delegatecall(data)`) | User-controlled target. |
| `integer_overflow_unchecked.sol` | Unchecked arithmetic | 22–24 (mint), 30–32 (burn) | `unchecked` block allows overflow/underflow. |
| `safe_reentrancy_fixed.sol` | **None** (false positive test) | — | State updated before call; should not be reported as reentrancy. |

## Expected vulnerabilities (Rust / Anchor-style)

| File | Expected finding | Notes |
|------|------------------|--------|
| `anchor_unsigned_math.rs` | Integer overflow/underflow risk | `vault.balance + amount` / `- amount` without checks. |
| `anchor_missing_access_control.rs` | Missing access control | `set_authority` and `withdraw_all` lack authority checks. |

## Validation checklist (anti-hallucination)

For each reported vulnerability, confirm:

- [ ] **Line number** is between 1 and `total lines` of the contract.
- [ ] **Code snippet** exactly matches the source at that line (no paraphrase).
- [ ] **Function name** exists in the contract (search for `function functionName`).
- [ ] **Proof of concept** includes concrete steps, values, or code (no generic “attacker might exploit”).
- [ ] **Confidence** is HIGH only when exploit is clear; otherwise MEDIUM (with condition) or moved to `suspicious_patterns_requiring_investigation`.

## Running automated tests (optional)

If you add Jest/Vitest or similar tests that call the analyze API with these fixtures, assert:

1. For vulnerable contracts: at least one vulnerability with correct `line_number` and matching `code_snippet`.
2. For `safe_reentrancy_fixed.sol`: no reentrancy in `vulnerabilities` (may appear in `false_positives` with reason “state updated before call”).
3. Response JSON includes `suspicious_patterns_requiring_investigation` when appropriate (e.g. low-confidence patterns).
