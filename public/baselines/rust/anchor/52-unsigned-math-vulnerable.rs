//! BASELINE: Unchecked math (vulnerable)
//! METADATA: Category: rust_anchor | Safe: false | Immunefi Level: 5
use anchor_lang::prelude::*;

#[program]
pub mod math_vulnerable {
    use super::*;
    pub fn add(ctx: Context<Add>, amount: u64) -> Result<()> {
        let acc = &mut ctx.accounts.account;
        acc.balance += amount; // can overflow
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
