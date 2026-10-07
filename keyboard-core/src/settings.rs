//! The keyboards' settings, apart from where each platform stores them

use crate::convert;
use crate::delimiter::Delimiter;

/// The keyboards' settings, with the extension's defaults
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Settings {
    /// The markers that math is typed between
    pub delimiter: Delimiter,
    /// Drop ( ), [ ] and { } that only group a fraction, script or argument
    pub strip_brackets: bool,
    /// Write fractions that have a character of their own, like ½, with it
    pub vulgar_fracs: bool,
    /// Write other fractions as a superscript over a subscript, like ʸ⁄ₓ
    pub script_fracs: bool,
    /// The skin tone for emoji that take one, numbered as in `asciimath_core.h`
    pub skin_tone: u8,
}

impl Default for Settings {
    fn default() -> Self {
        Settings {
            delimiter: Delimiter::default(),
            strip_brackets: true,
            vulgar_fracs: true,
            script_fracs: true,
            skin_tone: 0,
        }
    }
}

impl Settings {
    /// The name [`delimiter`][Settings::delimiter] is stored under, as in the extension
    pub const DELIMITER: &'static str = "delimiter";
    /// The name [`strip_brackets`][Settings::strip_brackets] is stored under
    pub const STRIP_BRACKETS: &'static str = "pruneParens";
    /// The name [`vulgar_fracs`][Settings::vulgar_fracs] is stored under
    pub const VULGAR_FRACS: &'static str = "vulgarFractions";
    /// The name [`script_fracs`][Settings::script_fracs] is stored under
    pub const SCRIPT_FRACS: &'static str = "scriptFractions";
    /// The name [`skin_tone`][Settings::skin_tone] is stored under
    pub const SKIN_TONE: &'static str = "skinTone";

    /// The names skin tones are stored under, each at its number
    pub const SKIN_TONES: [&'static str; 6] = [
        "Default",
        "Light",
        "MediumLight",
        "Medium",
        "MediumDark",
        "Dark",
    ];

    /// The number of the skin tone stored under `name`, if there is one
    #[must_use]
    pub fn skin_tone_number(name: &str) -> Option<u8> {
        Settings::SKIN_TONES
            .iter()
            .position(|&tone| tone == name)
            .and_then(|number| u8::try_from(number).ok())
    }

    /// Convert `math` with these settings, as [`Composer`][crate::Composer] wants it converted
    #[must_use]
    pub fn convert(&self, math: &str, placeholders: bool) -> String {
        convert(
            math,
            self.strip_brackets,
            self.vulgar_fracs,
            self.script_fracs,
            self.skin_tone,
            placeholders,
        )
    }
}

#[cfg(test)]
mod tests {
    use super::Settings;
    use crate::delimiter::Delimiter;

    #[test]
    fn defaults_are_the_extensions() {
        let settings = Settings::default();
        assert_eq!(settings.delimiter, Delimiter::DoubleDollar);
        assert!(settings.strip_brackets && settings.vulgar_fracs && settings.script_fracs);
        assert_eq!(settings.skin_tone, 0);
    }

    #[test]
    fn skin_tones_are_numbered_in_order() {
        assert_eq!(Settings::skin_tone_number("Default"), Some(0));
        assert_eq!(Settings::skin_tone_number("MediumLight"), Some(2));
        assert_eq!(Settings::skin_tone_number("Dark"), Some(5));
        assert_eq!(Settings::skin_tone_number("dark"), None);
        assert_eq!(Settings::skin_tone_number(""), None);
    }

    #[test]
    fn converts_with_its_options() {
        let plain = Settings {
            strip_brackets: false,
            vulgar_fracs: false,
            script_fracs: false,
            skin_tone: 5,
            ..Settings::default()
        };
        assert_eq!(Settings::default().convert("1/2", false), "½");
        assert_eq!(plain.convert("1/2", false), "1/2");
        assert_eq!(Settings::default().convert(":hand:", false), "✋");
        assert_eq!(plain.convert(":hand:", false), "✋🏿");
        assert_eq!(Settings::default().convert("x^", true), "x⸋");
    }
}
