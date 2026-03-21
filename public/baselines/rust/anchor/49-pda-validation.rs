//! BASELINE: PDA validation (safe)
//! METADATA: Category: rust_anchor | Safe: true
use anchor_lang::prelude::*;

#[program]
pub mod pda_validation {
    use super::*;
    pub fn init(ctx: Context<Init>, bump: u8) -> Result<()> {
        ctx.accounts.pda.bump = bump;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Init<'info> {
    #[account(init, seeds = [b"pda"], bump, payer = user, space = 8 + 1)]
    pub pda: Account<'info, PdaAccount>,
    #[account(mut)]
    pub user: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[account]
pub struct PdaAccount {
    pub bump: u8,
}
