//! BASELINE: Origin verification (safe)
//! METADATA: Category: rust_substrate | Safe: true
#![cfg_attr(not(feature = "std"), no_std)]
use frame_support::pallet_prelude::*;
use frame_system::pallet_prelude::*;

#[frame_support::pallet]
pub mod pallet {
    use super::*;

    #[pallet::config]
    pub trait Config: frame_system::Config {
        type AdminOrigin: EnsureOrigin<Self::RuntimeOrigin>;
    }

    #[pallet::call]
    impl<T: Config> Pallet<T> {
        #[pallet::weight(10_000)]
        pub fn admin_only(origin: OriginFor<T>) -> DispatchResult {
            T::AdminOrigin::ensure_origin(origin.clone())?;
            let _ = ensure_signed(origin)?;
            Ok(())
        }
    }
}
