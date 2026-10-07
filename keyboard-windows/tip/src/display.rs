//! The underline under held text, as apps ask for it

use crate::guard::guard;
use crate::ids::{DISPLAY_ATTRIBUTE, NAME};
use crate::server::Alive;
use std::cell::Cell;
use windows::Win32::Foundation::{E_INVALIDARG, E_NOTIMPL, E_POINTER, S_FALSE};
use windows::Win32::UI::TextServices::{
    IEnumTfDisplayAttributeInfo, IEnumTfDisplayAttributeInfo_Impl, ITfDisplayAttributeInfo,
    ITfDisplayAttributeInfo_Impl, TF_ATTR_INPUT, TF_DISPLAYATTRIBUTE, TF_LS_SOLID,
};
use windows_core::{BSTR, GUID, Result, implement};

/// The one display attribute: a solid underline in the app's own colours
#[implement(ITfDisplayAttributeInfo)]
struct Underline {
    _alive: Alive,
}

/// The underline, if `id` is its id
pub fn underline(id: &GUID) -> Result<ITfDisplayAttributeInfo> {
    if *id == DISPLAY_ATTRIBUTE {
        Ok(Underline {
            _alive: Alive::new(),
        }
        .into())
    } else {
        Err(E_INVALIDARG.into())
    }
}

impl ITfDisplayAttributeInfo_Impl for Underline_Impl {
    fn GetGUID(&self) -> Result<GUID> {
        Ok(DISPLAY_ATTRIBUTE)
    }

    fn GetDescription(&self) -> Result<BSTR> {
        guard(|| Ok(BSTR::from(NAME)))
    }

    fn GetAttributeInfo(&self, attribute: *mut TF_DISPLAYATTRIBUTE) -> Result<()> {
        if attribute.is_null() {
            Err(E_POINTER.into())
        } else {
            let underlined = TF_DISPLAYATTRIBUTE {
                lsStyle: TF_LS_SOLID,
                bAttr: TF_ATTR_INPUT,
                ..TF_DISPLAYATTRIBUTE::default()
            };
            // SAFETY: `attribute` is not null, and COM requires it to point to a struct to fill
            unsafe { attribute.write(underlined) };
            Ok(())
        }
    }

    fn SetAttributeInfo(&self, _attribute: *const TF_DISPLAYATTRIBUTE) -> Result<()> {
        Err(E_NOTIMPL.into())
    }

    fn Reset(&self) -> Result<()> {
        Ok(())
    }
}

/// Lists the display attributes, of which there is one
#[implement(IEnumTfDisplayAttributeInfo)]
pub struct Underlines {
    /// How many attributes have been listed or skipped
    position: Cell<u32>,
    _alive: Alive,
}

impl Underlines {
    /// A list that starts `position` attributes in
    pub fn new(position: u32) -> Self {
        Underlines {
            position: Cell::new(position),
            _alive: Alive::new(),
        }
    }
}

impl IEnumTfDisplayAttributeInfo_Impl for Underlines_Impl {
    fn Clone(&self) -> Result<IEnumTfDisplayAttributeInfo> {
        guard(|| Ok(Underlines::new(self.position.get()).into()))
    }

    fn Next(
        &self,
        count: u32,
        attributes: *mut Option<ITfDisplayAttributeInfo>,
        fetched: *mut u32,
    ) -> Result<()> {
        guard(|| {
            let listed = if count > 0 && self.position.get() == 0 && !attributes.is_null() {
                let attribute = underline(&DISPLAY_ATTRIBUTE)?;
                // SAFETY: `attributes` is not null, and COM requires it to point to `count`
                // slots to fill, of which there is at least one
                unsafe { attributes.write(Some(attribute)) };
                self.position.set(1);
                1
            } else {
                0
            };
            if !fetched.is_null() {
                // SAFETY: `fetched` is not null, and COM requires it to point to a number to set
                unsafe { fetched.write(listed) };
            }
            if listed == count {
                Ok(())
            } else {
                Err(S_FALSE.into())
            }
        })
    }

    fn Reset(&self) -> Result<()> {
        self.position.set(0);
        Ok(())
    }

    fn Skip(&self, count: u32) -> Result<()> {
        let left = 1_u32.saturating_sub(self.position.get());
        self.position
            .set(1.min(self.position.get().saturating_add(count)));
        if count <= left {
            Ok(())
        } else {
            Err(S_FALSE.into())
        }
    }
}
