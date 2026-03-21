// REFERENCE: Anchor safe withdrawal pattern
// Use this as baseline for Anchor access control

use anchor_lang::prelude::*;

#[program]
pub mod safe_withdrawal {
    use super::*;

    pub fn withdraw_all(ctx: Context<WithdrawAll>, amount: u64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;

        // SAFE PATTERN 1: Authority check via has_one constraint
        // SAFE PATTERN 2: State updated BEFORE CPI

        require!(vault.balance >= amount, ErrorCode::InsufficientBalance);
        vault.balance -= amount;

        // External call (CPI) happens AFTER state update
        let transfer_ix = system_program::Transfer {
            from: ctx.accounts.vault_account.to_account_info(),
            to: ctx.accounts.authority.to_account_info(),
        };
        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                transfer_ix,
            ),
            amount,
        )?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct WithdrawAll<'info> {
    #[account(mut, has_one = authority)] // SAFE: has_one ensures authority match
    pub vault: Account<'info, Vault>,

    #[account(mut)]
    pub vault_account: SystemAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>, // SAFE: Signer constraint

    pub system_program: Program<'info, System>,
}

#[account]
pub struct Vault {
    pub authority: Pubkey,
    pub balance: u64,
}

#[error_code]
pub enum ErrorCode {
    InsufficientBalance,
}
