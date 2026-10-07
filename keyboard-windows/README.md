Ascii Math Unicode keyboard for Windows
=======================================

Developer notes for the Windows keyboard, which is not finished: it has never run on Windows, its installer is not signed, and there is no options window and no update check yet.
It is a text input processor for the Text Services Framework: a COM library that Windows loads into every app that takes text.
It holds and converts typed math with the same Rust code as the Mac keyboard, in `keyboard-core`.

Layout
------

- `tip/` is the library, `asciimath_unicode_tip.dll`.
  - `session.rs` and `ids.rs` are plain Rust that builds and is tested on any system.
    `Session` wraps the shared composer for Windows' habit of asking whether a key will be eaten before sending it.
  - Everything else is only built for Windows: `server.rs` (the class factory and the exports `DllGetClassObject` and `DllCanUnloadNow`), `text_service.rs` (the object that gets the keys), `edit.rs` (reading and changing an app's text), `display.rs` (the underline), `keys.rs` (turning a key message into a key), `stored.rs` (the settings) and `registration.rs`.
  - `tests/exports.rs` loads the built library on Windows and checks its exports.
- `app/` is `AsciiMathUnicode.exe`, which for now only has `register` and `unregister`, for the installer to run as administrator.
- `resource/` gives both files their version details, from their build scripts.
  It only does so where there is a resource compiler, so not on a Mac.
- `installer/` is the installer, `AsciiMathUnicode.msi`, written for WiX 6.

The settings are read from `HKEY_CURRENT_USER\Software\AsciiMathUnicode` each time math is started, with the names the extension uses: `delimiter` and `skinTone` as strings, `pruneParens`, `vulgarFractions` and `scriptFractions` as numbers (DWORD) that are zero or one.
Anything missing or unreadable is its default.

The ids in `ids.rs` are what installed copies are found by and must never change.

Checking from a Mac
-------------------

Nothing here runs on a Mac, but all of it can be compiled and linted for Windows:

```sh
rustup target add x86_64-pc-windows-gnu i686-pc-windows-gnu
cargo clippy --target x86_64-pc-windows-gnu -p keyboard-windows-tip -p keyboard-windows-app --all-targets -- -D warnings
cargo clippy --target i686-pc-windows-gnu -p keyboard-windows-tip -p keyboard-windows-app --all-targets -- -D warnings
```

The `-msvc` targets that are released can be linted the same way once added with `rustup`, since linting doesn't link.
`cargo test --workspace` runs the tests of the plain Rust parts, and the `keyboard-windows-build` workflow lints, tests and builds on Windows for 64 and 32 bits.

Released builds link the C runtime in (`.cargo/config.toml` at the root), because the library is loaded on machines that don't have it.
The library must also never panic into the app it is loaded in: every function Windows calls runs inside `guard`, and the lints in `tip/src/lib.rs` forbid `unwrap`, `expect`, `panic!` and indexing.

Trying it on Windows
--------------------

Every run of the `keyboard-windows-build` workflow builds the installer, installs it, checks that Windows finds the keyboard, and removes it again.
The installer it built is the run's `keyboard-windows-installer` artifact: open the run on GitHub's Actions page and download it from the bottom of the summary.
It is a zip holding `AsciiMathUnicode.msi`, which is not signed, so Windows warns about it before running it.
Releases carry the same file beside the Mac's.

The keyboard is then listed under English (United States) in the language settings, and is removed from Settings › Apps, which leaves each user's settings in place.

The installer
-------------

`installer/Package.wxs` is for 64-bit Windows on Intel and AMD processors, and installs for every user of the machine:

- `AsciiMathUnicode.exe` in `%ProgramFiles%\Ascii Math Unicode\`;
- the 64-bit library in a folder below that named for the version, and the 32-bit one likewise below `%ProgramFiles(x86)%\Ascii Math Unicode\`;
- the class, as `HKLM\SOFTWARE\Classes\CLSID\{5B01258F-A59A-4C16-BACD-2ACD0BA02944}\InprocServer32`, in the 64-bit view of the registry for the 64-bit library and in the 32-bit view for the other;
- and then it runs `AsciiMathUnicode.exe register`, and `unregister` before it removes anything.

Any version installs over any other, older or newer, by removing it first.
The library is loaded in nearly every running app, and the installer never closes one or asks for a restart.
A new version's library goes in a new folder, apps started from then on load it, and apps already running keep the old one, whose file goes at the next restart.
Installing a different build of the same version over a library that is in use is the case that isn't covered, and may need a restart to come right.

To build it on Windows, with Rust and the .NET SDK, from the root of the repository:

```bat
rustup target add x86_64-pc-windows-msvc i686-pc-windows-msvc
cargo build --release --target x86_64-pc-windows-msvc -p keyboard-windows-tip -p keyboard-windows-app
cargo build --release --target i686-pc-windows-msvc -p keyboard-windows-tip
dotnet build keyboard-windows\installer -c Release -p:Version=1.2.3
```

That writes `target\installer\AsciiMathUnicode.msi`; `dotnet` fetches WiX itself.
Set `KEYBOARD_VERSION` to the same version for the `cargo` steps to have it in the files' details too.
Then, from an administrator's prompt, `tip/tests/installed.rs` checks an installed copy, and that removing it leaves nothing behind:

```bat
msiexec /i target\installer\AsciiMathUnicode.msi /qn /l*v install.log
cargo test --target x86_64-pc-windows-msvc -p keyboard-windows-tip --test installed -- --ignored --exact present
msiexec /x target\installer\AsciiMathUnicode.msi /qn
cargo test --target x86_64-pc-windows-msvc -p keyboard-windows-tip --test installed -- --ignored --exact gone
```

A release takes its version from its tag, `keyboard-v1.2.3`, which the Mac keyboard shares; the versions in the `Cargo.toml` files are not used.

By hand, while working on the library, the same can be done without the installer from an administrator's prompt: add the `InprocServer32` key above with `reg add`, its default value the full path of the built library and `ThreadingModel` set to `Apartment` (and again with `/reg:32` for the 32-bit build), then run `AsciiMathUnicode.exe register`.
To undo it, run `AsciiMathUnicode.exe unregister` and delete the `CLSID` key.

What only Windows can show
--------------------------

None of the COM code has been used by a person. On Windows, check first:

- that the installer runs from a double click, and what Windows says about it being unsigned;
- that the library loads and the keyboard can be picked at all, in a 64-bit and a 32-bit app;
- installing a newer version while apps are open, and removing the keyboard while it is in use;
- typing in Notepad: `$$x^2$$` is underlined while typed and becomes `x²`, and Return, Escape and Backspace do what they do on the Mac;
- that a key the keyboard doesn't want (an arrow, Ctrl+S, a mouse click, Alt+Tab) while math is held leaves it as typed, once, with no underline left over;
- apps that differ in how they hand over keys and grant edits: Edge or Chrome, Word, VS Code, Windows Terminal;
- a layout with dead keys and AltGr, and the backtick delimiter on such a layout;
- that a password field is left alone;
- which language the keyboard is listed under and whether the key layout changes, which is an open decision (see `register` in `tip/src/registration.rs`).
