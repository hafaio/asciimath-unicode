//! Key presses, reduced to what the composer acts on

/// A key press, reduced to what [`Composer`][crate::Composer] acts on
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Key<'a> {
    /// Typed text, usually one character
    Text(&'a str),
    /// The key that deletes the character before the caret
    Backspace,
    /// The escape key
    Escape,
    /// The return key or the keypad's enter key
    Enter,
    /// Any other key: arrows, tab, shortcuts, function keys, dead keys
    Other,
}

// virtual key codes from Carbon's `Events.h`
const MAC_RETURN: u16 = 0x24;
const MAC_DELETE: u16 = 0x33;
const MAC_ESCAPE: u16 = 0x35;
const MAC_KEYPAD_ENTER: u16 = 0x4c;

impl<'a> Key<'a> {
    /// The key of a macOS key-down event
    ///
    /// Escape, return and backspace go by `key_code`, and everything else by `characters`, so that
    /// every keyboard layout works. `is_shortcut` says command or control was held.
    #[must_use]
    pub fn from_mac(characters: &'a str, key_code: u16, is_shortcut: bool) -> Self {
        if is_shortcut {
            Key::Other
        } else {
            match key_code {
                MAC_ESCAPE => Key::Escape,
                MAC_DELETE => Key::Backspace,
                MAC_RETURN | MAC_KEYPAD_ENTER => Key::Enter,
                _ if is_typed(characters) => Key::Text(characters),
                _ => Key::Other,
            }
        }
    }
}

/// Whether `characters` is text to type rather than an arrow, function key or control key
fn is_typed(characters: &str) -> bool {
    !characters.is_empty()
        && characters
            .chars()
            .all(|chr| !chr.is_control() && !is_private_use(chr))
}

/// Whether `chr` is in a private use area, where macOS puts arrows and function keys
fn is_private_use(chr: char) -> bool {
    matches!(
        chr,
        '\u{e000}'..='\u{f8ff}' | '\u{f0000}'..='\u{ffffd}' | '\u{100000}'..='\u{10fffd}'
    )
}

#[cfg(test)]
mod tests {
    use super::{Key, MAC_DELETE, MAC_ESCAPE, MAC_KEYPAD_ENTER, MAC_RETURN};

    // more of Carbon's virtual key codes
    const MAC_A: u16 = 0x00;
    const MAC_V: u16 = 0x09;
    const MAC_E: u16 = 0x0e;
    const MAC_4: u16 = 0x15;
    const MAC_P: u16 = 0x23;
    const MAC_BACKSLASH: u16 = 0x2a;
    const MAC_TAB: u16 = 0x30;
    const MAC_SPACE: u16 = 0x31;
    const MAC_FORWARD_DELETE: u16 = 0x75;
    const MAC_LEFT_ARROW: u16 = 0x7b;

    #[test]
    fn characters_are_text_whatever_the_key_code() {
        assert_eq!(Key::from_mac("a", MAC_A, false), Key::Text("a"));
        assert_eq!(Key::from_mac("$", MAC_4, false), Key::Text("$"));
        assert_eq!(Key::from_mac("$", MAC_BACKSLASH, false), Key::Text("$"));
        assert_eq!(Key::from_mac("π", MAC_P, false), Key::Text("π"));
        assert_eq!(Key::from_mac(" ", MAC_SPACE, false), Key::Text(" "));
    }

    #[test]
    fn editing_keys_go_by_key_code() {
        assert_eq!(Key::from_mac("\u{1b}", MAC_ESCAPE, false), Key::Escape);
        assert_eq!(Key::from_mac("\u{7f}", MAC_DELETE, false), Key::Backspace);
        assert_eq!(Key::from_mac("\r", MAC_RETURN, false), Key::Enter);
        assert_eq!(Key::from_mac("\u{3}", MAC_KEYPAD_ENTER, false), Key::Enter);
    }

    #[test]
    fn everything_else_is_other() {
        assert_eq!(Key::from_mac("\u{f702}", MAC_LEFT_ARROW, false), Key::Other);
        assert_eq!(
            Key::from_mac("\u{f728}", MAC_FORWARD_DELETE, false),
            Key::Other
        );
        assert_eq!(Key::from_mac("\t", MAC_TAB, false), Key::Other);
        assert_eq!(Key::from_mac("", MAC_E, false), Key::Other);
        assert_eq!(Key::from_mac("v", MAC_V, true), Key::Other);
        assert_eq!(Key::from_mac("\r", MAC_RETURN, true), Key::Other);
    }
}
