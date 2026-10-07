//! Gives the library its version details

use keyboard_windows_resource::{Artifact, embed};

fn main() {
    println!("cargo:rerun-if-changed=build.rs");
    embed(Artifact::Library("asciimath_unicode_tip.dll"));
}
