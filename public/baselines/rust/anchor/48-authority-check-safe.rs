//! BASELINE: Anchor authority check (safe)
//! METADATA: Category: rust_anchor | Safe: true
use anchor_lang::prelude::*;

#[program]
pub mod authority_safe {
    use super::*;
    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;
        require!(vault.balance >= amount, ErrorCode::InsufficientBalance);
        vault.balance -= amount;
        // CPI transfer...
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
