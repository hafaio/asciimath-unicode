//! Reading a key-down message

use keyboard_core::Key;
use windows::Win32::Foundation::{LPARAM, WPARAM};
use windows::Win32::UI::Input::KeyboardAndMouse::{
    GetKeyboardLayout, GetKeyboardState, ToUnicodeEx, VIRTUAL_KEY, VK_CONTROL, VK_LWIN, VK_MENU,
    VK_RWIN,
};
use windows::Win32::UI::WindowsAndMessaging::GetMessageTime;

/// The `ToUnicodeEx` flag that leaves the keyboard state alone, so a dead key stays pending
const KEEP_KEYBOARD_STATE: u32 = 1 << 2;

/// A key-down message with what the keyboard layout makes of it
#[derive(Debug)]
pub struct Pressed {
    virtual_key: u16,
    /// What the key types, which is nothing for a dead key
    text: String,
    is_shortcut: bool,
    /// A number shared by every call about this message, as [`Session`][crate::Session] wants
    pub stamp: u64,
}

impl Pressed {
    /// Read the key-down message that is being handled on this thread
    pub fn read(wparam: WPARAM, lparam: LPARAM) -> Self {
        let message = u64::try_from(lparam.0.cast_unsigned()).unwrap_or_default();
        let virtual_key = u16::try_from(wparam.0 & 0xffff).unwrap_or_default();
        let scan_code = u32::try_from((message >> 16) & 0xff).unwrap_or_default();

        let mut state = [0_u8; 256];
        // SAFETY: `state` is the 256 bytes the function fills. If it fails they stay zero, which
        // reads as no modifier held.
        let _ = unsafe { GetKeyboardState(&mut state) };
        let is_down = |key: VIRTUAL_KEY| {
            state
                .get(usize::from(key.0))
                .is_some_and(|&key_state| key_state & 0x80 != 0)
        };

        let mut buffer = [0_u16; 16];
        // SAFETY: the buffers outlive the call, and the layout is this thread's own
        let count = unsafe {
            ToUnicodeEx(
                u32::from(virtual_key),
                scan_code,
                &state,
                &mut buffer,
                KEEP_KEYBOARD_STATE,
                Some(GetKeyboardLayout(0)),
            )
        };
        // a negative count is a dead key
        let text = usize::try_from(count)
            .ok()
            .and_then(|count| buffer.get(..count))
            .map(String::from_utf16_lossy)
            .unwrap_or_default();

        // SAFETY: the function only reads what this thread last took from its message queue
        let time = unsafe { GetMessageTime() }.cast_unsigned();
        Pressed {
            virtual_key,
            text,
            // control and alt together are AltGr
            is_shortcut: is_down(VK_CONTROL) != is_down(VK_MENU)
                || is_down(VK_LWIN)
                || is_down(VK_RWIN),
            stamp: u64::from(time) << 32 | (message & 0xffff_ffff),
        }
    }

    /// The key for the composer, or `None` for a modifier pressed on its own
    pub fn key(&self) -> Option<Key<'_>> {
        Key::from_windows(self.virtual_key, &self.text, self.is_shortcut)
    }
}
