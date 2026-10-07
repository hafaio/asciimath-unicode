//! The ids Windows knows the keyboard by
//!
//! Installed copies are found by these, so they must never change.

/// The class id of the text input processor: `5B01258F-A59A-4C16-BACD-2ACD0BA02944`
pub const CLASS_ID: u128 = 0x5b01_258f_a59a_4c16_bacd_2acd_0ba0_2944;

/// The id of the keyboard's language profile: `7F5C1841-08E6-4D2D-A569-F4E6EEFAB7E9`
pub const PROFILE_ID: u128 = 0x7f5c_1841_08e6_4d2d_a569_f4e6_eefa_b7e9;

/// The id of the underline shown under held text: `72A1AD62-9A9B-4644-957C-65BFFD51807B`
pub const DISPLAY_ATTRIBUTE_ID: u128 = 0x72a1_ad62_9a9b_4644_957c_65bf_fd51_807b;

/// The name the keyboard is listed under
pub const NAME: &str = "Ascii Math Unicode";

/// The registry key under `HKEY_CURRENT_USER` that holds the settings
pub const SETTINGS_KEY: &str = r"Software\AsciiMathUnicode";

/// [`CLASS_ID`] as Windows takes it
#[cfg(windows)]
pub(crate) const CLASS: windows_core::GUID = windows_core::GUID::from_u128(CLASS_ID);

/// [`PROFILE_ID`] as Windows takes it
#[cfg(windows)]
pub(crate) const PROFILE: windows_core::GUID = windows_core::GUID::from_u128(PROFILE_ID);

/// [`DISPLAY_ATTRIBUTE_ID`] as Windows takes it
#[cfg(windows)]
pub(crate) const DISPLAY_ATTRIBUTE: windows_core::GUID =
    windows_core::GUID::from_u128(DISPLAY_ATTRIBUTE_ID);

#[cfg(test)]
mod tests {
    use super::{CLASS_ID, DISPLAY_ATTRIBUTE_ID, PROFILE_ID};

    #[test]
    fn ids_are_the_released_ones() {
        assert_eq!(
            format!("{CLASS_ID:032X}"),
            "5B01258FA59A4C16BACD2ACD0BA02944"
        );
        assert_eq!(
            format!("{PROFILE_ID:032X}"),
            "7F5C184108E64D2DA569F4E6EEFAB7E9"
        );
        assert_eq!(
            format!("{DISPLAY_ATTRIBUTE_ID:032X}"),
            "72A1AD629A9B4644957C65BFFD51807B"
        );
    }
}
