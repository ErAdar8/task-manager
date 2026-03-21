//! BASELINE: Balance transfer (safe)
//! METADATA: Category: rust_substrate | Safe: true
#![cfg_attr(not(feature = "std"), no_std)]
use frame_support::pallet_prelude::*;
use frame_system::pallet_prelude::*;

#[frame_support::pallet]
pub mod pallet {
    use super::*;

    #[pallet::config]
    pub trait Config: frame_system::Config {
        type Currency: frame_support::traits::Currency<Self::AccountId>;
    }

    #[pallet::call]
    impl<T: Config> Pallet<T> {
        #[pallet::weight(10_000)]
        pub fn transfer(
            origin: OriginFor<T>,
            dest: T::AccountId,
            amount: u64,
        ) -> DispatchResult {
            let sender = ensure_signed(origin)?;
            T::Currency::transfer(&sender, &dest, amount.into(), frame_support::traits::ExistenceRequirement::KeepAlive)?;
            Ok(())
        }
    }
}
