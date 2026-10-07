//! The built library is one that COM can load: it has the two functions COM looks up by name
#![cfg(windows)]

use std::path::PathBuf;
use windows::Win32::System::LibraryLoader::{GetProcAddress, LoadLibraryW};
use windows_core::{HSTRING, PCSTR, s};

/// The library cargo built next to this test, which sits in `deps` below it
fn library() -> PathBuf {
    let test = std::env::current_exe().expect("the test has a path");
    let deps = test.parent().expect("the test is in a folder");
    deps.parent()
        .expect("the folder of the test is in the build folder")
        .join("asciimath_unicode_tip.dll")
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
