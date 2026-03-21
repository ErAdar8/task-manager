//! BASELINE: Storage migration (safe)
//! METADATA: Category: rust_substrate | Safe: true
#![cfg_attr(not(feature = "std"), no_std)]
use frame_support::{pallet_prelude::*, storage::migration::put_storage_value};
use frame_system::pallet_prelude::*;

#[frame_support::pallet]
pub mod pallet {
    use super::*;

    #[pallet::storage]
    pub type NewStorage<T: Config> = StorageMap<_, Blake2_128Concat, T::AccountId, u64, ValueQuery>;

    #[pallet::call]
    impl<T: Config> Pallet<T> {
        #[pallet::weight(10_000)]
        pub fn migrate_old(origin: OriginFor<T>) -> DispatchResult {
            let who = ensure_signed(origin)?;
            // migrate from old storage to NewStorage
            Ok(())
        }
    }
}
