//! BASELINE: Runtime upgrade (safe)
//! METADATA: Category: rust_substrate | Safe: true
#![cfg_attr(not(feature = "std"), no_std)]
use frame_support::pallet_prelude::*;

#[frame_support::pallet]
pub mod pallet {
    #[pallet::storage]
    pub type StorageVersion = StorageValue<_, u16, ValueQuery>;

    #[pallet::call]
    impl<T: Config> Pallet<T> {
        #[pallet::weight(0)]
        pub fn migrate(_origin: OriginFor<T>) -> DispatchResult {
            StorageVersion::put(2);
            Ok(())
        }
    }
}
