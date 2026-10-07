//! Keeping panics inside the keyboard, away from the app it is loaded into

use std::panic::{AssertUnwindSafe, catch_unwind};
use windows::Win32::Foundation::E_UNEXPECTED;
use windows_core::Result;

/// Run the body of a function Windows calls, turning a panic into an error
pub fn guard<T>(body: impl FnOnce() -> Result<T>) -> Result<T> {
    catch_unwind(AssertUnwindSafe(body)).unwrap_or_else(|_| Err(E_UNEXPECTED.into()))
}
