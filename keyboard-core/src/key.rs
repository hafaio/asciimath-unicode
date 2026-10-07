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

// virtual-key codes from `WinUser.h`
const WINDOWS_BACK: u16 = 0x08;
const WINDOWS_RETURN: u16 = 0x0d;
const WINDOWS_SHIFT: u16 = 0x10;
const WINDOWS_CONTROL: u16 = 0x11;
const WINDOWS_MENU: u16 = 0x12;
const WINDOWS_CAPITAL: u16 = 0x14;
const WINDOWS_ESCAPE: u16 = 0x1b;
const WINDOWS_LWIN: u16 = 0x5b;
const WINDOWS_RWIN: u16 = 0x5c;
const WINDOWS_NUMLOCK: u16 = 0x90;
const WINDOWS_SCROLL: u16 = 0x91;
const WINDOWS_LSHIFT: u16 = 0xa0;
const WINDOWS_RMENU: u16 = 0xa5;

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

    /// The key of a Windows key-down message, or `None` for a modifier pressed on its own
    ///
    /// Escape, return and backspace go by `virtual_key`, and everything else by `text`, which is
    /// what `ToUnicodeEx` made of the key: empty for a dead key or a key that types nothing.
    /// `is_shortcut` says control, alt or the Windows key was held, other than control and alt
    /// together, which is how `AltGr` arrives.
    ///
    /// Windows sends shift, control, alt, the Windows keys and the lock keys as keys of their own
    /// before the key they modify, so they are no key press here, or shift would end the holding.
    #[must_use]
    pub fn from_windows(virtual_key: u16, text: &'a str, is_shortcut: bool) -> Option<Self> {
        match virtual_key {
            WINDOWS_SHIFT
            | WINDOWS_CONTROL
            | WINDOWS_MENU
            | WINDOWS_CAPITAL
            | WINDOWS_LWIN
            | WINDOWS_RWIN
            | WINDOWS_NUMLOCK
            | WINDOWS_SCROLL
            | WINDOWS_LSHIFT..=WINDOWS_RMENU => None,
            _ if is_shortcut => Some(Key::Other),
            WINDOWS_ESCAPE => Some(Key::Escape),
            WINDOWS_BACK => Some(Key::Backspace),
            WINDOWS_RETURN => Some(Key::Enter),
            _ if is_typed(text) => Some(Key::Text(text)),
            _ => Some(Key::Other),
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
    use super::{
        Key, MAC_DELETE, MAC_ESCAPE, MAC_KEYPAD_ENTER, MAC_RETURN, WINDOWS_BACK, WINDOWS_CAPITAL,
        WINDOWS_CONTROL, WINDOWS_ESCAPE, WINDOWS_LSHIFT, WINDOWS_LWIN, WINDOWS_MENU,
        WINDOWS_RETURN, WINDOWS_RMENU, WINDOWS_SHIFT,
    };

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

    // more of `WinUser.h`'s virtual-key codes
    const WINDOWS_TAB: u16 = 0x09;
    const WINDOWS_SPACE: u16 = 0x20;
    const WINDOWS_LEFT: u16 = 0x25;
    const WINDOWS_DELETE: u16 = 0x2e;
    const WINDOWS_4: u16 = 0x34;
    const WINDOWS_A: u16 = 0x41;
    const WINDOWS_E: u16 = 0x45;
    const WINDOWS_Q: u16 = 0x51;
    const WINDOWS_V: u16 = 0x56;
    const WINDOWS_F5: u16 = 0x74;
    const WINDOWS_OEM_6: u16 = 0xdd;
    const WINDOWS_OEM_102: u16 = 0xe2;

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

    #[test]
    fn windows_text_is_text_whatever_the_virtual_key() {
        let text = |text, virtual_key| Key::from_windows(virtual_key, text, false);
        assert_eq!(text("a", WINDOWS_A), Some(Key::Text("a")));
        assert_eq!(text("$", WINDOWS_4), Some(Key::Text("$")));
        assert_eq!(text("$", WINDOWS_OEM_6), Some(Key::Text("$")));
        assert_eq!(text(" ", WINDOWS_SPACE), Some(Key::Text(" ")));
        // AltGr text is still text
        assert_eq!(text("@", WINDOWS_Q), Some(Key::Text("@")));
        assert_eq!(text("\\", WINDOWS_OEM_102), Some(Key::Text("\\")));
        // a dead key followed by its letter
        assert_eq!(text("ê", WINDOWS_E), Some(Key::Text("ê")));
    }

    #[test]
    fn windows_editing_keys_go_by_virtual_key() {
        let key = |text, virtual_key| Key::from_windows(virtual_key, text, false);
        assert_eq!(key("\u{1b}", WINDOWS_ESCAPE), Some(Key::Escape));
        assert_eq!(key("\u{8}", WINDOWS_BACK), Some(Key::Backspace));
        assert_eq!(key("\r", WINDOWS_RETURN), Some(Key::Enter));
        assert_eq!(key("", WINDOWS_RETURN), Some(Key::Enter));
    }

    #[test]
    fn windows_everything_else_is_other() {
        let key = |text, virtual_key| Key::from_windows(virtual_key, text, false);
        assert_eq!(key("", WINDOWS_LEFT), Some(Key::Other));
        assert_eq!(key("", WINDOWS_DELETE), Some(Key::Other));
        assert_eq!(key("", WINDOWS_F5), Some(Key::Other));
        assert_eq!(key("\t", WINDOWS_TAB), Some(Key::Other));
        // a dead key types nothing until the next key
        assert_eq!(key("", WINDOWS_OEM_6), Some(Key::Other));
    }

    #[test]
    fn windows_shortcuts_are_other() {
        let shortcut = |text, virtual_key| Key::from_windows(virtual_key, text, true);
        assert_eq!(shortcut("\u{16}", WINDOWS_V), Some(Key::Other));
        assert_eq!(shortcut("v", WINDOWS_V), Some(Key::Other));
        assert_eq!(shortcut("\r", WINDOWS_RETURN), Some(Key::Other));
        assert_eq!(shortcut("\u{7f}", WINDOWS_BACK), Some(Key::Other));
    }

    #[test]
    fn windows_modifiers_alone_are_no_key() {
        for virtual_key in [
            WINDOWS_SHIFT,
            WINDOWS_CONTROL,
            WINDOWS_MENU,
            WINDOWS_CAPITAL,
            WINDOWS_LWIN,
            WINDOWS_LSHIFT,
            WINDOWS_RMENU,
        ] {
            assert_eq!(Key::from_windows(virtual_key, "", false), None);
            assert_eq!(Key::from_windows(virtual_key, "", true), None);
        }
    }
}
