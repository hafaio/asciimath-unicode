//! The C interface to `asciimath-unicode` that the keyboard's Swift code calls
//!
//! [`asciimath_convert`] and [`asciimath_free`] are declared for C in `include/asciimath_core.h`.
//! [`convert`] is the same conversion for Rust callers, and converts as the extension's binding
//! does when that keeps typed spaces and adds none around operators.
#![warn(
    clippy::pedantic,
    clippy::undocumented_unsafe_blocks,
    missing_docs,
    unsafe_op_in_unsafe_fn
)]

use asciimath_unicode::{Conf, Layout, Placeholders, SkinTone};
use std::ffi::{CStr, CString, c_char};
use std::ptr;

/// Skin tone by its number in `asciimath_core.h`, where an unknown number is no skin tone
fn skin_tone(tone: u8) -> SkinTone {
    match tone {
        1 => SkinTone::Light,
        2 => SkinTone::MediumLight,
        3 => SkinTone::Medium,
        4 => SkinTone::MediumDark,
        5 => SkinTone::Dark,
        _ => SkinTone::Default,
    }
}

/// Convert ascii math to unicode
///
/// All of `inp` is read as math, and every string converts. The options are those of
/// [`asciimath_unicode::Conf`]:
///
/// - `strip_brackets` drops ( ), [ ] and { } that only group a fraction, script or argument
/// - `vulgar_fracs` writes fractions that have a character of their own, like ½, with it
/// - `script_fracs` writes other fractions as a superscript over a subscript, like ʸ⁄ₓ, instead of
///   with a plain slash
/// - `tone` is the skin tone for emoji that take one, numbered as in `asciimath_core.h`; 0 and
///   unknown numbers are no skin tone
/// - `placeholders` shows the parts that aren't there yet as □, ⸋ and ▫, for math that is still
///   being typed
///
/// Whitespace typed between parts of the math is always kept, and none is added around operators.
///
/// ```
/// assert_eq!(keyboard_core::convert("1/2", true, true, true, 0, false), "½");
/// ```
#[must_use]
#[allow(clippy::fn_params_excessive_bools)]
pub fn convert(
    inp: &str,
    strip_brackets: bool,
    vulgar_fracs: bool,
    script_fracs: bool,
    tone: u8,
    placeholders: bool,
) -> String {
    Conf::default()
        .with_strip_brackets(strip_brackets)
        .with_vulgar_fracs(vulgar_fracs)
        .with_skin_tone(skin_tone(tone))
        .with_layout(if script_fracs {
            Layout::InlineScript
        } else {
            Layout::InlinePlain
        })
        .with_placeholders(placeholders.then(Placeholders::default))
        .with_keep_spaces(true)
        .parse(inp)
        .to_string()
}

/// Convert nul-terminated utf-8 ascii math to unicode, for C
///
/// This is [`convert`] behind a C signature, with the same options. It returns a nul-terminated
/// string to release with [`asciimath_free`], or null if `inp` is null or not utf-8.
///
/// # Safety
///
/// `inp` must be null or point to a nul-terminated string that stays valid for the call.
#[unsafe(no_mangle)]
#[allow(clippy::fn_params_excessive_bools)]
pub unsafe extern "C" fn asciimath_convert(
    inp: *const c_char,
    strip_brackets: bool,
    vulgar_fracs: bool,
    script_fracs: bool,
    skin_tone: u8,
    placeholders: bool,
) -> *mut c_char {
    if inp.is_null() {
        ptr::null_mut()
    } else {
        // SAFETY: the caller guarantees a non-null `inp` is a valid nul-terminated string
        let text = unsafe { CStr::from_ptr(inp) }.to_str();
        text.ok()
            .map(|text| {
                convert(
                    text,
                    strip_brackets,
                    vulgar_fracs,
                    script_fracs,
                    skin_tone,
                    placeholders,
                )
            })
            // the input had no nul, and converting never adds one
            .and_then(|converted| CString::new(converted).ok())
            .map_or(ptr::null_mut(), CString::into_raw)
    }
}

/// Release a string returned by [`asciimath_convert`]
///
/// # Safety
///
/// `text` must be null or a pointer from [`asciimath_convert`] that hasn't been released yet.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn asciimath_free(text: *mut c_char) {
    if !text.is_null() {
        // SAFETY: the caller guarantees `text` came from `CString::into_raw` and is unreleased
        drop(unsafe { CString::from_raw(text) });
    }
}

#[cfg(test)]
mod tests {
    use super::{asciimath_convert, asciimath_free};
    use std::ffi::{CStr, CString};
    use std::ptr;

    fn convert_through_c(inp: &[u8]) -> Option<String> {
        let inp = CString::new(inp).unwrap();
        // SAFETY: `inp` is a valid nul-terminated string and the result is released once
        unsafe {
            let raw = asciimath_convert(inp.as_ptr(), true, true, true, 0, false);
            if raw.is_null() {
                None
            } else {
                let converted = CStr::from_ptr(raw).to_str().unwrap().to_owned();
                asciimath_free(raw);
                Some(converted)
            }
        }
    }

    #[test]
    fn converts() {
        assert_eq!(convert_through_c(b"1/2").as_deref(), Some("½"));
        assert_eq!(convert_through_c(b"").as_deref(), Some(""));
        assert_eq!(convert_through_c("α^2".as_bytes()).as_deref(), Some("α²"));
    }

    #[test]
    fn invalid_input_is_null() {
        assert_eq!(convert_through_c(&[0xff, 0xfe]), None);
        // SAFETY: null is allowed for both
        unsafe {
            assert!(asciimath_convert(ptr::null(), true, true, true, 0, false).is_null());
            asciimath_free(ptr::null_mut());
        }
    }

    #[test]
    fn unknown_skin_tone_is_none() {
        assert_eq!(super::convert(":hand:", true, true, true, 200, false), "✋");
        assert_eq!(super::convert(":hand:", true, true, true, 5, false), "✋🏿");
    }

    #[test]
    fn typed_spaces_are_kept() {
        assert_eq!(super::convert("a + b", true, true, true, 0, false), "a + b");
        assert_eq!(super::convert("a+b", true, true, true, 0, false), "a+b");
    }

    #[test]
    fn placeholders() {
        assert_eq!(super::convert("x^", true, true, true, 0, true), "x⸋");
        assert_eq!(super::convert("x^", true, true, true, 0, false), "x");
    }
}
