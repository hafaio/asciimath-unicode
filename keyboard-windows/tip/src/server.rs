//! The COM server: what Windows calls to create the text service

use crate::guard::guard;
use crate::ids::CLASS;
use crate::text_service::TextService;
use std::ffi::c_void;
use std::sync::atomic::{AtomicUsize, Ordering};
use windows::Win32::Foundation::{
    CLASS_E_CLASSNOTAVAILABLE, CLASS_E_NOAGGREGATION, E_POINTER, S_FALSE, S_OK,
};
use windows::Win32::System::Com::{IClassFactory, IClassFactory_Impl};
use windows_core::{BOOL, GUID, HRESULT, IUnknown, Interface, Ref, Result, implement};

/// How many objects and server locks keep the library loaded
static ALIVE: AtomicUsize = AtomicUsize::new(0);

/// Keeps the library loaded for as long as it lives
#[derive(Debug)]
pub struct Alive(());

impl Alive {
    /// Count one more thing that needs the library
    pub fn new() -> Self {
        ALIVE.fetch_add(1, Ordering::SeqCst);
        Alive(())
    }
}

impl Drop for Alive {
    fn drop(&mut self) {
        ALIVE.fetch_sub(1, Ordering::SeqCst);
    }
}

/// Creates text services
#[implement(IClassFactory)]
struct Factory {
    _alive: Alive,
}

impl IClassFactory_Impl for Factory_Impl {
    fn CreateInstance(
        &self,
        outer: Ref<IUnknown>,
        interface_id: *const GUID,
        object: *mut *mut c_void,
    ) -> Result<()> {
        guard(|| {
            if object.is_null() || interface_id.is_null() {
                Err(E_POINTER.into())
            } else {
                // SAFETY: `object` is not null, and COM requires it to point to a pointer to set
                unsafe { object.write(std::ptr::null_mut()) };
                if outer.is_null() {
                    let service: IUnknown = TextService::new().into();
                    // SAFETY: both pointers are not null and come from COM, which requires them
                    // to be valid for a `QueryInterface` call
                    unsafe { service.query(interface_id, object) }.ok()
                } else {
                    Err(CLASS_E_NOAGGREGATION.into())
                }
            }
        })
    }

    fn LockServer(&self, lock: BOOL) -> Result<()> {
        if lock.as_bool() {
            ALIVE.fetch_add(1, Ordering::SeqCst);
        } else {
            ALIVE.fetch_sub(1, Ordering::SeqCst);
        }
        Ok(())
    }
}

/// Hand out the class factory of the text service, as COM asks of an in-process server
///
/// # Safety
///
/// `class_id` and `interface_id` must be null or point to ids, and `object` must be null or
/// point to a pointer that may be written.
#[unsafe(no_mangle)]
#[allow(non_snake_case)]
pub unsafe extern "system" fn DllGetClassObject(
    class_id: *const GUID,
    interface_id: *const GUID,
    object: *mut *mut c_void,
) -> HRESULT {
    guard(|| {
        if class_id.is_null() || interface_id.is_null() || object.is_null() {
            Err(E_POINTER.into())
        } else {
            // SAFETY: the caller guarantees a non-null `object` points to a pointer to set
            unsafe { object.write(std::ptr::null_mut()) };
            // SAFETY: the caller guarantees a non-null `class_id` points to an id
            if unsafe { *class_id } == CLASS {
                let factory: IClassFactory = Factory {
                    _alive: Alive::new(),
                }
                .into();
                // SAFETY: the caller guarantees the non-null `interface_id` and `object` are
                // valid, which is what `QueryInterface` needs
                unsafe { factory.query(interface_id, object) }.ok()
            } else {
                Err(CLASS_E_CLASSNOTAVAILABLE.into())
            }
        }
    })
    .into()
}

/// Say whether nothing of this library is in use, as COM asks before unloading it
#[unsafe(no_mangle)]
#[allow(non_snake_case)]
pub extern "system" fn DllCanUnloadNow() -> HRESULT {
    if ALIVE.load(Ordering::SeqCst) == 0 {
        S_OK
    } else {
        S_FALSE
    }
}
