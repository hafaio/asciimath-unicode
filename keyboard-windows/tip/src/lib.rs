//! The Windows keyboard: a text input processor that Windows loads into each app
//!
//! [`Session`] and [`ids`] are plain Rust and build everywhere. Everything that talks to Windows
//! is only built for it: the exports `DllGetClassObject` and `DllCanUnloadNow` that make this
//! library a COM server, the text service behind them, and `register` and `unregister` for the
//! installer.
#![warn(
    clippy::pedantic,
    clippy::undocumented_unsafe_blocks,
    missing_docs,
    unsafe_op_in_unsafe_fn
)]
// a panic in a method Windows calls takes the app that is being typed into down with it
#![cfg_attr(
    not(test),
    deny(
        clippy::unwrap_used,
        clippy::expect_used,
        clippy::panic,
        clippy::indexing_slicing
    )
)]
// what `windows_core::implement` writes for each COM object
#![cfg_attr(windows, allow(clippy::inline_always, clippy::ref_as_ptr))]

pub mod ids;
mod session;

#[cfg(windows)]
mod display;
#[cfg(windows)]
mod edit;
#[cfg(windows)]
mod guard;
#[cfg(windows)]
mod keys;
#[cfg(windows)]
mod registration;
#[cfg(windows)]
mod server;
#[cfg(windows)]
mod stored;
#[cfg(windows)]
mod text_service;

pub use session::Session;

#[cfg(windows)]
pub use registration::{register, unregister};
#[cfg(windows)]
pub use server::{DllCanUnloadNow, DllGetClassObject};
