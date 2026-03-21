//! BASELINE: Account validation (safe)
//! METADATA: Category: rust_anchor | Safe: true
use anchor_lang::prelude::*;

#[program]
pub mod account_validation {
    use super::*;
    pub fn update(ctx: Context<Update>, data: u64) -> Result<()> {
        ctx.accounts.data.value = data;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Update<'info> {
    #[account(mut, constraint = data.owner == authority.key())]
    pub data: Account<'info, DataAccount>,
    pub authority: Signer<'info>,
}

#[account]
pub struct DataAccount {
    pub owner: Pubkey,
    pub value: u64,
}
