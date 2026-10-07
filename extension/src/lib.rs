//! The wasm binding the extension uses to convert ascii math to unicode.
#![warn(clippy::pedantic, missing_docs)]

use asciimath_unicode::{Conf, Layout, SkinTone};
use wasm_bindgen::prelude::wasm_bindgen;

/// The skin tone given to emoji that take one.
#[wasm_bindgen]
pub enum Tone {
    /// No skin tone.
    Default,
    /// Light skin tone.
    Light,
    /// Medium-light skin tone.
    MediumLight,
    /// Medium skin tone.
    Medium,
    /// Medium-dark skin tone.
    MediumDark,
    /// Dark skin tone.
    Dark,
}

impl From<Tone> for SkinTone {
    fn from(inp: Tone) -> Self {
        match inp {
            Tone::Default => SkinTone::Default,
            Tone::Light => SkinTone::Light,
            Tone::MediumLight => SkinTone::MediumLight,
            Tone::Medium => SkinTone::Medium,
            Tone::MediumDark => SkinTone::MediumDark,
            Tone::Dark => SkinTone::Dark,
        }
    }
}

/// Converts ascii math to unicode.
///
/// `strip_brackets` drops brackets that fractions and scripts already imply.
/// `vulgar_fracs` uses single-character fractions like ½ where one exists, and
/// `script_fracs` writes the rest with super- and subscripts. `skin_tone` is
/// given to emoji that take one. `keep_spaces` writes the whitespace typed
/// between parts of the math back out, and `spaced_operators` puts a space on
/// either side of an operator that joins two parts.
#[must_use]
#[wasm_bindgen]
#[allow(clippy::fn_params_excessive_bools)]
pub fn convert(
    inp: &str,
    strip_brackets: bool,
    vulgar_fracs: bool,
    script_fracs: bool,
    skin_tone: Tone,
    keep_spaces: bool,
    spaced_operators: bool,
) -> String {
    Conf::default()
        .with_strip_brackets(strip_brackets)
        .with_vulgar_fracs(vulgar_fracs)
        .with_skin_tone(skin_tone.into())
        .with_layout(if script_fracs {
            Layout::InlineScript
        } else {
            Layout::InlinePlain
        })
        .with_keep_spaces(keep_spaces)
        .with_spaced_operators(spaced_operators)
        .parse(inp)
        .to_string()
}
