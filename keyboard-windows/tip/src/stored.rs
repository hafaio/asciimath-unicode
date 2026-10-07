//! Reading the settings from the registry

use crate::ids::SETTINGS_KEY;
use keyboard_core::{Delimiter, Settings};
use windows_registry::{CURRENT_USER, Key};

/// The stored settings, with the default for each one that is missing, invalid or unreadable
///
/// An app in a sandbox may not be allowed to read the key at all, and gets the defaults.
pub fn load() -> Settings {
    let defaults = Settings::default();
    match CURRENT_USER.open(SETTINGS_KEY) {
        Ok(key) => Settings {
            delimiter: key
                .get_string(Settings::DELIMITER)
                .ok()
                .and_then(|name| Delimiter::from_name(&name))
                .unwrap_or(defaults.delimiter),
            strip_brackets: flag(&key, Settings::STRIP_BRACKETS, defaults.strip_brackets),
            vulgar_fracs: flag(&key, Settings::VULGAR_FRACS, defaults.vulgar_fracs),
            script_fracs: flag(&key, Settings::SCRIPT_FRACS, defaults.script_fracs),
            skin_tone: key
                .get_string(Settings::SKIN_TONE)
                .ok()
                .and_then(|name| Settings::skin_tone_number(&name))
                .unwrap_or(defaults.skin_tone),
        },
        Err(_) => defaults,
    }
}

/// The number stored under `name` as a flag, where anything but zero is set
fn flag(key: &Key, name: &str, default: bool) -> bool {
    key.get_u32(name).map_or(default, |value| value != 0)
}
