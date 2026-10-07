//! Telling Windows that the keyboard exists

use crate::ids::{CLASS, NAME, PROFILE};
use windows::Win32::Foundation::RPC_E_CHANGED_MODE;
use windows::Win32::System::Com::{
    CLSCTX_INPROC_SERVER, COINIT_APARTMENTTHREADED, CoCreateInstance, CoInitializeEx,
    CoUninitialize,
};
use windows::Win32::UI::Input::KeyboardAndMouse::HKL;
use windows::Win32::UI::TextServices::{
    CLSID_TF_CategoryMgr, CLSID_TF_InputProcessorProfiles, GUID_TFCAT_DISPLAYATTRIBUTEPROVIDER,
    GUID_TFCAT_TIP_KEYBOARD, GUID_TFCAT_TIPCAP_COMLESS, GUID_TFCAT_TIPCAP_IMMERSIVESUPPORT,
    GUID_TFCAT_TIPCAP_SYSTRAYSUPPORT, GUID_TFCAT_TIPCAP_UIELEMENTENABLED, ITfCategoryMgr,
    ITfInputProcessorProfileMgr,
};
use windows_core::{GUID, Result};

/// The language the keyboard is listed under: English (United States)
const LANGUAGE: u16 = 0x0409;

/// What the keyboard is and can do. Secure mode is left out, so that it never loads on the
/// sign-in screen or an elevation prompt.
const CATEGORIES: [GUID; 6] = [
    GUID_TFCAT_TIP_KEYBOARD,
    GUID_TFCAT_DISPLAYATTRIBUTEPROVIDER,
    GUID_TFCAT_TIPCAP_IMMERSIVESUPPORT,
    GUID_TFCAT_TIPCAP_SYSTRAYSUPPORT,
    GUID_TFCAT_TIPCAP_UIELEMENTENABLED,
    GUID_TFCAT_TIPCAP_COMLESS,
];

/// Run `body` with COM set up on this thread
fn with_com<T>(body: impl FnOnce() -> Result<T>) -> Result<T> {
    // SAFETY: the call is paired with `CoUninitialize` below whenever it succeeds
    let initialized = unsafe { CoInitializeEx(None, COINIT_APARTMENTTHREADED) };
    if initialized.is_ok() {
        let result = body();
        // SAFETY: COM was set up by the successful call above, and everything `body` made with
        // it is gone
        unsafe { CoUninitialize() };
        result
    } else if initialized == RPC_E_CHANGED_MODE {
        // the thread already has COM, set up another way, which serves as well
        body()
    } else {
        Err(initialized.into())
    }
}

fn profile_manager() -> Result<ITfInputProcessorProfileMgr> {
    // SAFETY: the class id names a system class, and the interface asked for is one of its own
    unsafe { CoCreateInstance(&CLSID_TF_InputProcessorProfiles, None, CLSCTX_INPROC_SERVER) }
}

fn category_manager() -> Result<ITfCategoryMgr> {
    // SAFETY: the class id names a system class, and the interface asked for is one of its own
    unsafe { CoCreateInstance(&CLSID_TF_CategoryMgr, None, CLSCTX_INPROC_SERVER) }
}

/// Register the keyboard with Windows for every user of the machine
///
/// This lists the keyboard as an input method for English (United States), enabled by default,
/// and says what kind of text service it is. It writes under `HKEY_LOCAL_MACHINE`, so it needs
/// an administrator. Registering again is harmless. The class itself (the path to this library
/// under `CLSID`) is the installer's to register, once for each of the 32- and 64-bit views of
/// the registry; what this function writes is shared by both.
///
/// **Open decision:** which languages to list the keyboard under, and which key layout it
/// brings along. For now it is English (United States) alone with no layout of its own, so a
/// user of another language gets an extra English entry and possibly the US layout.
///
/// # Errors
///
/// When COM can't be set up or Windows refuses the registration, which it does without
/// administrator rights.
pub fn register() -> Result<()> {
    with_com(|| {
        let name: Vec<u16> = NAME.encode_utf16().collect();
        let profiles = profile_manager()?;
        // SAFETY: the ids and the name outlive the call, and having no icon and no layout of
        // its own is allowed
        unsafe {
            profiles.RegisterProfile(
                &CLASS,
                LANGUAGE,
                &PROFILE,
                &name,
                &[],
                0,
                HKL::default(),
                0,
                true,
                0,
            )
        }?;
        let categories = category_manager()?;
        CATEGORIES.iter().try_for_each(|category| {
            // SAFETY: the ids outlive the call
            unsafe { categories.RegisterCategory(&CLASS, category, &CLASS) }
        })
    })
}

/// Remove what [`register`] registered, leaving each user's settings in place
///
/// Every step is attempted even if one fails.
///
/// # Errors
///
/// The first failure, when COM can't be set up or Windows refuses a step, which it does without
/// administrator rights.
pub fn unregister() -> Result<()> {
    with_com(|| {
        let categories = category_manager().and_then(|categories| {
            CATEGORIES
                .iter()
                .map(|category| {
                    // SAFETY: the ids outlive the call
                    unsafe { categories.UnregisterCategory(&CLASS, category, &CLASS) }
                })
                .fold(Ok(()), Result::and)
        });
        let profile = profile_manager().and_then(|profiles| {
            // SAFETY: the ids outlive the call
            unsafe { profiles.UnregisterProfile(&CLASS, LANGUAGE, &PROFILE, 0) }
        });
        categories.and(profile)
    })
}
