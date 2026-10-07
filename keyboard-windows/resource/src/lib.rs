//! Version details for the files of the Windows keyboard
//!
//! Windows shows a file's version, product and publisher from a resource inside it. The build
//! scripts of the library and the program call [`embed`] to write that resource and link it in.
//! It only happens where there is a resource compiler, which the Windows machines that build
//! releases have; anywhere else the files are built without the details.
#![warn(clippy::pedantic, missing_docs)]

use std::path::PathBuf;
use std::{env, fs};

/// The name of the product the files belong to
const PRODUCT: &str = "Ascii Math Unicode";

/// The publisher of the files
const PUBLISHER: &str = "hafa.cc";

/// The environment variable a release sets to the version it builds
const VERSION_VARIABLE: &str = "KEYBOARD_VERSION";

/// A file that gets version details
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Artifact<'name> {
    /// The package's library, by the name of its file
    Library(&'name str),
    /// A program of the package, by the name of its binary
    Program(&'name str),
}

impl Artifact<'_> {
    fn file_name(self) -> String {
        match self {
            Artifact::Library(file_name) => file_name.to_owned(),
            Artifact::Program(binary) => format!("{binary}.exe"),
        }
    }

    /// What Windows calls the kind of file: `VFT_DLL` or `VFT_APP`
    fn file_type(self) -> u8 {
        match self {
            Artifact::Library(_) => 2,
            Artifact::Program(_) => 1,
        }
    }
}

/// The four numbers Windows keeps a version as, from one written as `1.2.3`
fn numbers(version: &str) -> Option<[u16; 4]> {
    let mut parts = version.split('.').map(str::parse::<u16>);
    let major = parts.next()?.ok()?;
    let minor = parts.next()?.ok()?;
    let patch = parts.next()?.ok()?;
    parts.next().is_none().then_some([major, minor, patch, 0])
}

/// The resource script that gives `artifact` its details, if `version` is three numbers
fn script(artifact: Artifact, version: &str) -> Option<String> {
    let [major, minor, patch, build] = numbers(version)?;
    let file_name = artifact.file_name();
    let file_type = artifact.file_type();
    // 0x40004 is `VOS_NT_WINDOWS32`, and the block is named for American English in Unicode,
    // which the translation at the end repeats
    Some(format!(
        r#"1 VERSIONINFO
FILEVERSION {major},{minor},{patch},{build}
PRODUCTVERSION {major},{minor},{patch},{build}
FILEFLAGSMASK 0x3fL
FILEFLAGS 0x0L
FILEOS 0x40004L
FILETYPE 0x{file_type}L
FILESUBTYPE 0x0L
BEGIN
    BLOCK "StringFileInfo"
    BEGIN
        BLOCK "040904b0"
        BEGIN
            VALUE "CompanyName", "{PUBLISHER}\0"
            VALUE "FileDescription", "{PRODUCT}\0"
            VALUE "FileVersion", "{version}\0"
            VALUE "InternalName", "{file_name}\0"
            VALUE "OriginalFilename", "{file_name}\0"
            VALUE "ProductName", "{PRODUCT}\0"
            VALUE "ProductVersion", "{version}\0"
        END
    END
    BLOCK "VarFileInfo"
    BEGIN
        VALUE "Translation", 0x409, 1200
    END
END
"#
    ))
}

/// Give `artifact` of the package being built its version details
///
/// Call it from the package's build script. The version is the `KEYBOARD_VERSION` environment
/// variable, which a release sets, or else the package's own. Without a resource compiler, as
/// on a Mac that only checks the Windows code, nothing is linked in.
///
/// # Panics
///
/// When the version is not three numbers, the script can't be written, or the resource
/// compiler refuses it, each of which should fail the build.
pub fn embed(artifact: Artifact) {
    println!("cargo:rerun-if-env-changed={VERSION_VARIABLE}");
    let version = env::var(VERSION_VARIABLE)
        .or_else(|_| env::var("CARGO_PKG_VERSION"))
        .expect("cargo sets the package's version for build scripts");
    let script = script(artifact, &version)
        .unwrap_or_else(|| panic!("the version {version:?} is not three numbers like 1.2.3"));
    let folder = env::var_os("OUT_DIR").expect("cargo sets the output folder for build scripts");
    let path = PathBuf::from(folder).join("version.rc");
    fs::write(&path, script).expect("the output folder can be written to");
    let result = match artifact {
        Artifact::Library(_) => embed_resource::compile_for_cdylib(&path, embed_resource::NONE),
        Artifact::Program(binary) => {
            embed_resource::compile_for(&path, [binary], embed_resource::NONE)
        }
    };
    if let Err(error) = result.manifest_optional() {
        panic!("{error}");
    }
}

#[cfg(test)]
mod tests {
    use super::{Artifact, numbers, script};

    #[test]
    fn versions_are_three_numbers() {
        assert_eq!(numbers("1.2.3"), Some([1, 2, 3, 0]));
        assert_eq!(numbers("0.0.65535"), Some([0, 0, 65535, 0]));
        assert_eq!(numbers("1.2"), None);
        assert_eq!(numbers("1.2.3.4"), None);
        assert_eq!(numbers("1.2.x"), None);
        assert_eq!(numbers("1.2.65536"), None);
    }

    #[test]
    fn a_library_is_marked_as_one() {
        let script = script(Artifact::Library("some.dll"), "1.2.3").expect("the version is good");
        assert!(script.contains("FILEVERSION 1,2,3,0\n"));
        assert!(script.contains("FILETYPE 0x2L\n"));
        assert!(script.contains(r#"VALUE "OriginalFilename", "some.dll\0""#));
        assert!(script.contains(r#"VALUE "ProductVersion", "1.2.3\0""#));
    }

    #[test]
    fn a_program_is_named_for_its_binary() {
        let script = script(Artifact::Program("Some"), "1.2.3").expect("the version is good");
        assert!(script.contains("FILETYPE 0x1L\n"));
        assert!(script.contains(r#"VALUE "OriginalFilename", "Some.exe\0""#));
    }

    #[test]
    fn a_bad_version_has_no_script() {
        assert_eq!(script(Artifact::Program("Some"), "next"), None);
    }
}
