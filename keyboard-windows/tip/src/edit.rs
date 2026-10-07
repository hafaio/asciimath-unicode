//! Edit sessions, in which an app lets the keyboard read and change its text

use crate::guard::guard;
use crate::server::Alive;
use std::mem::ManuallyDrop;
use windows::Win32::Foundation::E_FAIL;
use windows::Win32::System::Com::CoTaskMemFree;
use windows::Win32::System::Variant::VT_I4;
use windows::Win32::UI::TextServices::{
    GUID_COMPARTMENT_EMPTYCONTEXT, GUID_COMPARTMENT_KEYBOARD_DISABLED, GUID_PROP_INPUTSCOPE,
    IS_PASSWORD, ITfCompartmentMgr, ITfContext, ITfEditSession, ITfEditSession_Impl, ITfInputScope,
    ITfInsertAtSelection, ITfRange, InputScope, TF_ANCHOR_END, TF_CONTEXT_EDIT_CONTEXT_FLAGS,
    TF_DEFAULT_SELECTION, TF_IAS_QUERYONLY, TF_SELECTION,
};
use windows_core::{GUID, IUnknown, Interface, Result, implement};

/// Runs a function once the app grants access to its text
#[implement(ITfEditSession)]
struct EditSession {
    /// What to do, given the cookie that proves access
    edit: Box<dyn Fn(u32) -> Result<()>>,
    _alive: Alive,
}

impl ITfEditSession_Impl for EditSession_Impl {
    fn DoEditSession(&self, cookie: u32) -> Result<()> {
        guard(|| (self.edit)(cookie))
    }
}

/// Ask `context` for access to its text and run `edit` with the cookie that proves it
///
/// `flags` say what kind of access, and whether `edit` must have run by the time this returns.
/// When it must, an error from `edit` is returned as this function's own.
pub fn request(
    context: &ITfContext,
    client_id: u32,
    flags: TF_CONTEXT_EDIT_CONTEXT_FLAGS,
    edit: impl Fn(u32) -> Result<()> + 'static,
) -> Result<()> {
    let session: ITfEditSession = EditSession {
        edit: Box::new(edit),
        _alive: Alive::new(),
    }
    .into();
    // SAFETY: `session` is a live edit session, which the context keeps a reference to for as
    // long as it needs it
    unsafe { context.RequestEditSession(client_id, &session, flags) }?.ok()
}

/// Where typed text would go: the selection, without changing it
pub fn insertion_point(context: &ITfContext, cookie: u32) -> Result<ITfRange> {
    let inserter: ITfInsertAtSelection = context.cast()?;
    // SAFETY: `cookie` is from the edit session this runs in, and no text is passed
    unsafe { inserter.InsertTextAtSelection(cookie, TF_IAS_QUERYONLY, &[]) }
}

/// The selection, which is the caret when nothing is selected
fn selection(context: &ITfContext, cookie: u32) -> Result<ITfRange> {
    let mut selections = [TF_SELECTION::default()];
    let mut fetched = 0;
    // SAFETY: `cookie` is from the edit session this runs in, and the call fills at most the
    // one slot it is given
    unsafe {
        context.GetSelection(
            cookie,
            TF_DEFAULT_SELECTION,
            &mut selections,
            &raw mut fetched,
        )
    }?;
    let [selection] = selections;
    ManuallyDrop::into_inner(selection.range).ok_or_else(|| E_FAIL.into())
}

/// Replace the text of `range`, which then covers the new text
pub fn set_text(range: &ITfRange, cookie: u32, text: &str) -> Result<()> {
    let text: Vec<u16> = text.encode_utf16().collect();
    // SAFETY: `cookie` is from the edit session this runs in
    unsafe { range.SetText(cookie, 0, &text) }
}

/// Whether the text of `range` is exactly `expected`
pub fn has_text(range: &ITfRange, cookie: u32, expected: &str) -> bool {
    let expected: Vec<u16> = expected.encode_utf16().collect();
    // one more than expected, so that longer text doesn't compare equal
    let mut text = vec![0_u16; expected.len() + 1];
    let mut fetched = 0;
    // SAFETY: `cookie` is from the edit session this runs in, and the call fills at most the
    // buffer it is given
    let read = unsafe { range.GetText(cookie, 0, &mut text, &raw mut fetched) };
    read.is_ok()
        && usize::try_from(fetched)
            .ok()
            .and_then(|fetched| text.get(..fetched))
            == Some(expected.as_slice())
}

/// Put the caret right after `range`
pub fn put_caret_after(context: &ITfContext, cookie: u32, range: &ITfRange) -> Result<()> {
    // SAFETY: cloning a live range has no other requirements
    let caret = unsafe { range.Clone() }?;
    // SAFETY: `cookie` is from the edit session this runs in
    unsafe { caret.Collapse(cookie, TF_ANCHOR_END) }?;
    let mut selection = TF_SELECTION {
        range: ManuallyDrop::new(Some(caret)),
        ..TF_SELECTION::default()
    };
    // SAFETY: `cookie` is from the edit session this runs in, and the selection is one live
    // range
    let result = unsafe { context.SetSelection(cookie, std::slice::from_ref(&selection)) };
    // SAFETY: the range is not used again
    unsafe { ManuallyDrop::drop(&mut selection.range) };
    result
}

/// Whether the caret of `context` is in a password field
///
/// # Errors
///
/// When the app doesn't say what kind of field it is, which is the usual case.
pub fn is_password(context: &ITfContext, cookie: u32) -> Result<bool> {
    let caret = selection(context, cookie)?;
    // SAFETY: the id outlives the call
    let property = unsafe { context.GetAppProperty(&GUID_PROP_INPUTSCOPE) }?;
    // SAFETY: `cookie` is from the edit session this runs in
    let value = unsafe { property.GetValue(cookie, &caret) }?;
    let scope: ITfInputScope = IUnknown::try_from(&value)?.cast()?;
    let mut scopes: *mut InputScope = std::ptr::null_mut();
    let mut count = 0;
    // SAFETY: both pointers are to locals for the call to set
    unsafe { scope.GetInputScopes(&raw mut scopes, &raw mut count) }?;
    let is_password = if scopes.is_null() {
        false
    } else {
        // SAFETY: the successful call set `scopes` to `count` scopes that live until freed below
        unsafe { std::slice::from_raw_parts(scopes, usize::try_from(count).unwrap_or_default()) }
            .contains(&IS_PASSWORD)
    };
    // SAFETY: the app allocated `scopes` for the caller to free this way, and it isn't used again
    unsafe { CoTaskMemFree(Some(scopes.cast_const().cast())) };
    Ok(is_password)
}

/// Whether the app has set the number stored under `id` in `context` to something but zero
fn is_set(context: &ITfContext, id: &GUID) -> bool {
    context
        .cast::<ITfCompartmentMgr>()
        // SAFETY: the id outlives the call
        .and_then(|compartments| unsafe { compartments.GetCompartment(id) })
        // SAFETY: reading a live compartment has no other requirements
        .and_then(|compartment| unsafe { compartment.GetValue() })
        .is_ok_and(|value| {
            // SAFETY: a variant of this type holds a number in this field
            value.vt() == VT_I4 && unsafe { value.Anonymous.Anonymous.Anonymous.lVal } != 0
        })
}

/// Whether the app wants no keyboard input in `context`, or the context has no text to edit
pub fn is_disabled(context: &ITfContext) -> bool {
    is_set(context, &GUID_COMPARTMENT_KEYBOARD_DISABLED)
        || is_set(context, &GUID_COMPARTMENT_EMPTYCONTEXT)
}
