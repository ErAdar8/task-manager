//! BASELINE: Checked math (safe)
//! METADATA: Category: rust_anchor | Safe: true
use anchor_lang::prelude::*;

#[program]
pub mod math_safe {
    use super::*;
    pub fn add(ctx: Context<Add>, amount: u64) -> Result<()> {
        let acc = &mut ctx.accounts.account;
        acc.balance = acc.balance.checked_add(amount).ok_or(ErrorCode::Overflow)?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Add<'info> {
    #[account(mut)]
    pub account: Account<'info, BalanceAccount>,
}

#[account]
pub struct BalanceAccount {
    pub balance: u64,
}
