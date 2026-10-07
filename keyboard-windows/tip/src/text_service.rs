//! The text service: the object Windows hands keys to in each app

use crate::display::{Underlines, underline};
use crate::edit;
use crate::guard::guard;
use crate::ids::DISPLAY_ATTRIBUTE;
use crate::keys::Pressed;
use crate::server::Alive;
use crate::session::Session;
use crate::stored;
use keyboard_core::{Key, Outcome, Settings};
use std::cell::{Cell, RefCell};
use std::rc::Rc;
use windows::Win32::Foundation::{E_POINTER, LPARAM, WPARAM};
use windows::Win32::System::Com::{CLSCTX_INPROC_SERVER, CoCreateInstance};
use windows::Win32::System::Variant::VARIANT;
use windows::Win32::UI::TextServices::{
    CLSID_TF_CategoryMgr, GUID_PROP_ATTRIBUTE, IEnumTfDisplayAttributeInfo, ITfCategoryMgr,
    ITfComposition, ITfCompositionSink, ITfCompositionSink_Impl, ITfContext, ITfContextComposition,
    ITfDisplayAttributeInfo, ITfDisplayAttributeProvider, ITfDisplayAttributeProvider_Impl,
    ITfDocumentMgr, ITfKeyEventSink, ITfKeyEventSink_Impl, ITfKeystrokeMgr, ITfRange, ITfSource,
    ITfTextInputProcessor_Impl, ITfTextInputProcessorEx, ITfTextInputProcessorEx_Impl,
    ITfThreadMgr, ITfThreadMgrEventSink, ITfThreadMgrEventSink_Impl, TF_ANCHOR_END,
    TF_ES_ASYNCDONTCARE, TF_ES_READ, TF_ES_READWRITE, TF_ES_SYNC,
};
use windows_core::{BOOL, GUID, IUnknownImpl, Interface, Ref, Result, implement};

/// The held text as an app shows it
#[derive(Debug, Clone)]
struct Held {
    /// The app's record of the underlined text
    composition: ITfComposition,
    /// The document the text is in
    context: ITfContext,
}

/// The keyboard in one thread of an app
///
/// Windows creates one for each thread that takes text input and hands it every key through
/// [`ITfKeyEventSink`]. Keys go to a [`Session`], and what it says to show is written to the
/// app's document in an edit session, with the held text as a composition, which is what apps
/// call text that is still being typed.
#[implement(
    ITfTextInputProcessorEx,
    ITfKeyEventSink,
    ITfCompositionSink,
    ITfThreadMgrEventSink,
    ITfDisplayAttributeProvider
)]
pub struct TextService {
    /// The thread's entry to the text services, while the keyboard is active
    thread_manager: RefCell<Option<ITfThreadMgr>>,
    /// The id Windows gave the keyboard for this thread
    client_id: Cell<u32>,
    /// What undoes listening for focus changes
    focus_cookie: Cell<Option<u32>>,
    /// The number that stands for the underline in this thread
    underline_atom: Cell<Option<u32>>,
    session: RefCell<Session>,
    /// The settings as they were when holding last started
    settings: Cell<Settings>,
    held: RefCell<Option<Held>>,
    /// The held text as it was last written to the document
    shown: RefCell<String>,
    _alive: Alive,
}

impl TextService {
    /// A text service that isn't active in any thread yet
    pub fn new() -> Self {
        TextService {
            thread_manager: RefCell::new(None),
            client_id: Cell::new(0),
            focus_cookie: Cell::new(None),
            underline_atom: Cell::new(None),
            session: RefCell::new(Session::default()),
            settings: Cell::new(Settings::default()),
            held: RefCell::new(None),
            shown: RefCell::new(String::new()),
            _alive: Alive::new(),
        }
    }
}

/// The number that stands for the underline in this thread
fn underline_atom() -> Result<u32> {
    // SAFETY: the class id names a system class, and the interface asked for is one of its own
    let categories: ITfCategoryMgr =
        unsafe { CoCreateInstance(&CLSID_TF_CategoryMgr, None, CLSCTX_INPROC_SERVER) }?;
    // SAFETY: the id outlives the call
    unsafe { categories.RegisterGUID(&DISPLAY_ATTRIBUTE) }
}

// No borrow of a `RefCell` is kept across a call into Windows, because such a call can come
// back in through another method before it returns.
impl TextService_Impl {
    fn activate(&self, thread_manager: &ITfThreadMgr, client_id: u32) -> Result<()> {
        self.client_id.set(client_id);
        self.thread_manager.replace(Some(thread_manager.clone()));
        let keystrokes: ITfKeystrokeMgr = thread_manager.cast()?;
        let key_sink: ITfKeyEventSink = self.to_interface();
        // SAFETY: the sink is a live object, which the thread manager keeps a reference to
        unsafe { keystrokes.AdviseKeyEventSink(client_id, &key_sink, true) }?;
        let source: ITfSource = thread_manager.cast()?;
        let focus_sink: ITfThreadMgrEventSink = self.to_interface();
        // SAFETY: the sink is a live object of the interface named, which the thread manager
        // keeps a reference to
        let cookie = unsafe { source.AdviseSink(&ITfThreadMgrEventSink::IID, &focus_sink) }?;
        self.focus_cookie.set(Some(cookie));
        // without the number held text shows without an underline, which still works
        self.underline_atom.set(underline_atom().ok());
        Ok(())
    }

    fn deactivate(&self) {
        self.end_holding();
        if let Some(thread_manager) = self.thread_manager.replace(None) {
            if let Some(cookie) = self.focus_cookie.take()
                && let Ok(source) = thread_manager.cast::<ITfSource>()
            {
                // SAFETY: the cookie is from this source and hasn't been used
                let _ = unsafe { source.UnadviseSink(cookie) };
            }
            if let Ok(keystrokes) = thread_manager.cast::<ITfKeystrokeMgr>() {
                // SAFETY: the id is the one the sink was added under
                let _ = unsafe { keystrokes.UnadviseKeyEventSink(self.client_id.get()) };
            }
        }
        self.underline_atom.set(None);
    }

    /// Take a key-down message, or only say whether it would be eaten, and return whether it is
    fn key_down(
        &self,
        context: &Ref<ITfContext>,
        wparam: WPARAM,
        lparam: LPARAM,
        is_test: bool,
    ) -> Result<BOOL> {
        guard(|| {
            let context = context.ok()?;
            let pressed = Pressed::read(wparam, lparam);
            let is_eaten = match pressed.key() {
                Some(key) if !edit::is_disabled(context) => {
                    self.take(context, key, pressed.stamp, is_test)
                }
                _ => false,
            };
            Ok(is_eaten.into())
        })
    }

    fn take(&self, context: &ITfContext, key: Key<'_>, stamp: u64, is_test: bool) -> bool {
        let is_starting = !self.session.borrow().is_holding() && Session::could_open(key);
        if is_starting && self.is_password(context) {
            false
        } else {
            if is_starting {
                let settings = stored::load();
                self.settings.set(settings);
                self.session.borrow_mut().set_delimiter(settings.delimiter);
            }
            let settings = self.settings.get();
            let convert = |math: &str, placeholders: bool| settings.convert(math, placeholders);
            let outcome = if is_test {
                self.session.borrow_mut().test(key, stamp, &convert)
            } else {
                Some(self.session.borrow_mut().press(key, stamp, &convert))
            };
            if let Some(outcome) = outcome {
                let is_eaten = !outcome.pass_through;
                self.show(context, outcome);
                is_eaten
            } else {
                true
            }
        }
    }

    /// Whether the caret is in a password field, as far as the app says
    fn is_password(&self, context: &ITfContext) -> bool {
        let found = Rc::new(Cell::new(false));
        let result = Rc::clone(&found);
        let target = context.clone();
        // an app that can't answer right away is taken to have no password field
        let _ = edit::request(
            context,
            self.client_id.get(),
            TF_ES_SYNC | TF_ES_READ,
            move |cookie| {
                result.set(edit::is_password(&target, cookie)?);
                Ok(())
            },
        );
        found.get()
    }

    /// Write `outcome` to the document of `context`, now if the app allows it and soon if not
    fn show(&self, context: &ITfContext, outcome: Outcome) {
        // an eaten key always has something to show, even if that is nothing in place of text
        // that an edit still waiting for the app is about to write
        let has_held = self.held.borrow().is_some();
        if has_held || !outcome.pass_through || !outcome.committed.is_empty() {
            let service = self.to_object();
            let target = context.clone();
            let requested = edit::request(
                context,
                self.client_id.get(),
                TF_ES_ASYNCDONTCARE | TF_ES_READWRITE,
                move |cookie| {
                    let applied = service.apply(&target, cookie, &outcome);
                    if applied.is_err() {
                        service.give_up(cookie);
                    }
                    applied
                },
            );
            // refused, or failed while running and already given up: either way nothing is held
            if requested.is_err() {
                self.session.borrow_mut().end_input();
                self.held.replace(None);
            }
        }
    }

    /// Make the document show `outcome` in place of what was held
    fn apply(&self, context: &ITfContext, cookie: u32, outcome: &Outcome) -> Result<()> {
        let held = self.held.borrow().clone();
        let range = match &held {
            // SAFETY: reading the range of a live composition has no other requirements
            Some(held) => unsafe { held.composition.GetRange() }?,
            None => edit::insertion_point(context, cookie)?,
        };
        let mut composition = held.map(|held| held.composition);

        let ends = !outcome.committed.is_empty() || outcome.marked.is_empty();
        // with nothing held and nothing to hand over, the app's selection must stay as it is
        if ends && (composition.is_some() || !outcome.committed.is_empty()) {
            if composition.is_some() {
                self.set_underline(context, cookie, &range, false);
            }
            edit::set_text(&range, cookie, &outcome.committed)?;
            // SAFETY: `cookie` is from the edit session this runs in
            unsafe { range.Collapse(cookie, TF_ANCHOR_END) }?;
            if let Some(composition) = composition.take() {
                self.held.replace(None);
                // SAFETY: `cookie` is from the edit session this runs in
                unsafe { composition.EndComposition(cookie) }?;
            }
            edit::put_caret_after(context, cookie, &range)?;
        }

        if !outcome.marked.is_empty() {
            let composition = if let Some(composition) = composition {
                composition
            } else {
                let composer: ITfContextComposition = context.cast()?;
                let sink: ITfCompositionSink = self.to_interface();
                // SAFETY: `cookie` is from the edit session this runs in, and the range and the
                // sink are live objects
                let composition = unsafe { composer.StartComposition(cookie, &range, &sink) }?;
                self.held.replace(Some(Held {
                    composition: composition.clone(),
                    context: context.clone(),
                }));
                composition
            };
            // SAFETY: reading the range of a live composition has no other requirements
            let range = unsafe { composition.GetRange() }?;
            edit::set_text(&range, cookie, &outcome.marked)?;
            self.shown.replace(outcome.marked.clone());
            self.set_underline(context, cookie, &range, true);
            edit::put_caret_after(context, cookie, &range)?;
        }
        Ok(())
    }

    /// Stop holding after an edit failed, leaving the document as the failure left it
    fn give_up(&self, cookie: u32) {
        self.session.borrow_mut().end_input();
        if let Some(held) = self.held.replace(None) {
            // SAFETY: `cookie` is from the edit session this runs in
            let _ = unsafe { held.composition.EndComposition(cookie) };
        }
    }

    /// Underline `range` as held text, or stop underlining it
    ///
    /// Failing leaves the text as it was, which costs only its looks.
    fn set_underline(&self, context: &ITfContext, cookie: u32, range: &ITfRange, is_on: bool) {
        // SAFETY: the id outlives the call
        if let Ok(property) = unsafe { context.GetProperty(&GUID_PROP_ATTRIBUTE) } {
            let atom = self
                .underline_atom
                .get()
                .and_then(|atom| i32::try_from(atom).ok());
            if !is_on {
                // SAFETY: `cookie` is from the edit session this runs in
                let _ = unsafe { property.Clear(cookie, range) };
            } else if let Some(atom) = atom {
                let value = VARIANT::from(atom);
                // SAFETY: `cookie` is from the edit session this runs in, and `value` outlives
                // the call
                let _ = unsafe { property.SetValue(cookie, range, &raw const value) };
            }
        }
    }

    /// Stop holding and leave the held text in its document as typed
    fn end_holding(&self) {
        let committed = self.session.borrow_mut().end_input();
        let held = self.held.borrow().clone();
        if let Some(held) = held {
            self.show(
                &held.context,
                Outcome {
                    committed,
                    ..Outcome::default()
                },
            );
        }
    }
}

impl ITfTextInputProcessor_Impl for TextService_Impl {
    fn Activate(&self, thread_manager: Ref<ITfThreadMgr>, client_id: u32) -> Result<()> {
        self.ActivateEx(thread_manager, client_id, 0)
    }

    fn Deactivate(&self) -> Result<()> {
        guard(|| {
            self.deactivate();
            Ok(())
        })
    }
}

impl ITfTextInputProcessorEx_Impl for TextService_Impl {
    fn ActivateEx(
        &self,
        thread_manager: Ref<ITfThreadMgr>,
        client_id: u32,
        _flags: u32,
    ) -> Result<()> {
        guard(|| {
            let activated = self.activate(thread_manager.ok()?, client_id);
            if activated.is_err() {
                self.deactivate();
            }
            activated
        })
    }
}

impl ITfKeyEventSink_Impl for TextService_Impl {
    fn OnSetFocus(&self, _is_foreground: BOOL) -> Result<()> {
        Ok(())
    }

    fn OnTestKeyDown(
        &self,
        context: Ref<ITfContext>,
        wparam: WPARAM,
        lparam: LPARAM,
    ) -> Result<BOOL> {
        self.key_down(&context, wparam, lparam, true)
    }

    fn OnTestKeyUp(
        &self,
        _context: Ref<ITfContext>,
        _wparam: WPARAM,
        _lparam: LPARAM,
    ) -> Result<BOOL> {
        guard(|| {
            self.session.borrow_mut().release();
            Ok(false.into())
        })
    }

    fn OnKeyDown(&self, context: Ref<ITfContext>, wparam: WPARAM, lparam: LPARAM) -> Result<BOOL> {
        self.key_down(&context, wparam, lparam, false)
    }

    fn OnKeyUp(&self, _context: Ref<ITfContext>, _wparam: WPARAM, _lparam: LPARAM) -> Result<BOOL> {
        guard(|| {
            self.session.borrow_mut().release();
            Ok(false.into())
        })
    }

    fn OnPreservedKey(&self, _context: Ref<ITfContext>, _id: *const GUID) -> Result<BOOL> {
        Ok(false.into())
    }
}

impl ITfCompositionSink_Impl for TextService_Impl {
    /// The app ended the composition itself, as when the caret is moved with the mouse
    fn OnCompositionTerminated(&self, cookie: u32, composition: Ref<ITfComposition>) -> Result<()> {
        guard(|| {
            let typed = self.session.borrow_mut().end_input();
            let shown = self.shown.take();
            if let Some(held) = self.held.replace(None) {
                // SAFETY: reading the range of a composition has no other requirements
                let range = unsafe { composition.ok()?.GetRange() }?;
                self.set_underline(&held.context, cookie, &range, false);
                // an app that ended it by changing the text keeps its own text
                if edit::has_text(&range, cookie, &shown) {
                    edit::set_text(&range, cookie, &typed)?;
                }
            }
            Ok(())
        })
    }
}

impl ITfThreadMgrEventSink_Impl for TextService_Impl {
    fn OnInitDocumentMgr(&self, _document: Ref<ITfDocumentMgr>) -> Result<()> {
        Ok(())
    }

    fn OnUninitDocumentMgr(&self, _document: Ref<ITfDocumentMgr>) -> Result<()> {
        Ok(())
    }

    fn OnSetFocus(
        &self,
        _focused: Ref<ITfDocumentMgr>,
        _previous: Ref<ITfDocumentMgr>,
    ) -> Result<()> {
        guard(|| {
            self.end_holding();
            Ok(())
        })
    }

    fn OnPushContext(&self, _context: Ref<ITfContext>) -> Result<()> {
        Ok(())
    }

    fn OnPopContext(&self, _context: Ref<ITfContext>) -> Result<()> {
        Ok(())
    }
}

impl ITfDisplayAttributeProvider_Impl for TextService_Impl {
    fn EnumDisplayAttributeInfo(&self) -> Result<IEnumTfDisplayAttributeInfo> {
        guard(|| Ok(Underlines::new(0).into()))
    }

    fn GetDisplayAttributeInfo(&self, id: *const GUID) -> Result<ITfDisplayAttributeInfo> {
        guard(|| {
            // SAFETY: COM requires a non-null `id` to point to an id
            let id = unsafe { id.as_ref() }.ok_or(E_POINTER)?;
            underline(id)
        })
    }
}
