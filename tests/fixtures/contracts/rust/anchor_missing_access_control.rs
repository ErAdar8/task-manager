//! Intentionally vulnerable: critical instruction has no owner/authority check.
//! Anyone can call set_authority (line with set_authority) and drain or change state.
//! Use for bounty validation — missing access control.

use anchor_lang::prelude::*;

#[program]
pub mod missing_acl {
    use super::*;

    /// No check that msg.sender / authority is admin — anyone can set new authority.
    pub fn set_authority(ctx: Context<SetAuthority>, new_authority: Pubkey) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.authority = new_authority;
        Ok(())
    }

    /// Withdraw has no authority check — anyone can withdraw.
    pub fn withdraw_all(ctx: Context<WithdrawAll>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        let amount = state.balance;
        state.balance = 0;
        // transfer amount to ctx.accounts.user...
        Ok(())
    }
}

#[derive(Accounts)]
pub struct SetAuthority<'info> {
    #[account(mut)]
    pub state: Account<'info, State>,
}

#[derive(Accounts)]
pub struct WithdrawAll<'info> {
    #[account(mut)]
    pub state: Account<'info, State>,
    /// CHECK: no constraint that user == state.authority
    pub user: AccountInfo<'info>,
}

#[account]
pub struct State {
    pub authority: Pubkey,
    pub balance: u64,
}
