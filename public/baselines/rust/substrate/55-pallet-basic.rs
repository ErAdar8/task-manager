//! BASELINE: Substrate pallet (basic)
//! METADATA: Category: rust_substrate | Safe: true
#![cfg_attr(not(feature = "std"), no_std)]
use frame_support::{pallet_prelude::*, traits::Currency};
use frame_system::pallet_prelude::*;
use sp_std::prelude::*;

#[frame_support::pallet]
pub mod pallet {
    use super::*;

    #[pallet::config]
    pub trait Config: frame_system::Config {
        type Currency: Currency<Self::AccountId>;
    }

    #[pallet::storage]
    pub type Value<T: Config> = StorageValue<_, u64, ValueQuery>;

    #[pallet::call]
    impl<T: Config> Pallet<T> {
        #[pallet::weight(10_000)]
        pub fn set_value(origin: OriginFor<T>, v: u64) -> DispatchResult {
            let _ = ensure_signed(origin)?;
            Value::<T>::put(v);
            Ok(())
        }
    }
}
