#![warn(clippy::pedantic)]

use asciimath_unicode::{Conf, Layout, SkinTone};
use wasm_bindgen::prelude::wasm_bindgen;

#[wasm_bindgen]
pub enum Tone {
    Default,
    Light,
    MediumLight,
    Medium,
    MediumDark,
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

#[must_use]
#[wasm_bindgen]
pub fn convert(
    inp: &str,
    strip_brackets: bool,
    vulgar_fracs: bool,
    script_fracs: bool,
    skin_tone: Tone,
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
        .parse(inp)
        .to_string()
}
