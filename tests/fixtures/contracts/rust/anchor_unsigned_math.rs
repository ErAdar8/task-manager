//! Intentionally risky: unchecked arithmetic in Solana/Anchor-style code.
//! Use for bounty validation — analyzer should flag overflow risk at exact lines.

use anchor_lang::prelude::*;

#[program]
pub mod vulnerable {
    use super::*;

    /// No overflow check: balance + amount can overflow (e.g. line with +).
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.balance = vault.balance + amount;  // potential overflow if not checked
        Ok(())
    }

    /// No underflow check: balance - amount can underflow.
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        vault.balance = vault.balance - amount;  // potential underflow
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub vault: Account<'info, Vault>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub vault: Account<'info, Vault>,
}

#[account]
pub struct Vault {
    pub balance: u64,
}
