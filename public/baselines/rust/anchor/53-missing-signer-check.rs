//! BASELINE: Missing signer/authority (vulnerable)
//! METADATA: Category: rust_anchor | Safe: false | Immunefi Level: 5
use anchor_lang::prelude::*;

#[program]
pub mod missing_signer {
    use super::*;
    pub fn set_authority(ctx: Context<SetAuthority>, new_authority: Pubkey) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.authority = new_authority; // no has_one = authority
        Ok(())
    }
}

#[derive(Accounts)]
pub struct SetAuthority<'info> {
    #[account(mut)]
    pub state: Account<'info, State>,
}

#[account]
pub struct State {
    pub authority: Pubkey,
}
