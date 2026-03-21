//! BASELINE: CPI before state (safe - state updated first)
//! METADATA: Category: rust_anchor | Safe: true
use anchor_lang::prelude::*;

#[program]
pub mod cpi_safe {
    use super::*;
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        let v = &mut ctx.accounts.vault;
        require!(v.balance >= amount, ErrorCode::InsufficientBalance);
        v.balance -= amount; // state first
        // CPI transfer after
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut, has_one = authority)]
    pub vault: Account<'info, Vault>,
    pub authority: Signer<'info>,
}

#[account]
pub struct Vault {
    pub authority: Pubkey,
    pub balance: u64,
}
