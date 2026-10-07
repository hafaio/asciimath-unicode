//! The built library is one that COM can load: it has the two functions COM looks up by name
#![cfg(windows)]

use std::path::PathBuf;
use windows::Win32::System::LibraryLoader::{GetProcAddress, LoadLibraryW};
use windows_core::{HSTRING, PCSTR, s};

/// The library cargo built for this test: beside the test in `deps`, or one folder up once
/// `cargo build` has run
fn library() -> PathBuf {
    let test = std::env::current_exe().expect("the test has a path");
    let deps = test.parent().expect("the test is in a folder");
    let name = "asciimath_unicode_tip.dll";
    let built = deps.parent().map(|profile| profile.join(name));
    built
        .into_iter()
        .chain([deps.join(name)])
        .find(|path| path.is_file())
        .unwrap_or_else(|| panic!("{name} is not in or above {}", deps.display()))
}

fn is_exported(name: PCSTR) -> bool {
    let path = HSTRING::from(library().as_os_str());
    // SAFETY: the path is a string that outlives the call, and loading runs no code of the
    // library's, which has no entry point of its own
    let module = unsafe { LoadLibraryW(&path) }.expect("the library loads");
    // SAFETY: `module` is the library just loaded, and `name` is a constant string
    unsafe { GetProcAddress(module, name) }.is_some()
}

#[test]
fn exports_what_com_looks_up() {
    // 32-bit builds must export the plain names too, not ones decorated with argument sizes
    assert!(is_exported(s!("DllGetClassObject")));
    assert!(is_exported(s!("DllCanUnloadNow")));
    assert!(!is_exported(s!("DllRegisterServer")));
}
