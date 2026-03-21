//! BASELINE: Weight calculation (safe)
//! METADATA: Category: rust_substrate | Safe: true
#![cfg_attr(not(feature = "std"), no_std)]
use frame_support::pallet_prelude::*;
use frame_system::pallet_prelude::*;

#[frame_support::pallet]
pub mod pallet {
    use super::*;

    #[pallet::call]
    impl<T: Config> Pallet<T> {
        #[pallet::weight(Weight::from_ref_time(10_000).set_proof_size(100))]
        pub fn do_work(origin: OriginFor<T>) -> DispatchResult {
            let _ = ensure_signed(origin)?;
            Ok(())
        }
    }
}
