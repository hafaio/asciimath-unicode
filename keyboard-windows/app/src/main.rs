//! The program that comes with the Windows keyboard
//!
//! For now it only does the installer's work: `AsciiMathUnicode register` tells Windows that the
//! keyboard exists and `AsciiMathUnicode unregister` takes that back. Both need an
//! administrator. On other systems it builds, so that the workspace does, and does nothing.
#![warn(
    clippy::pedantic,
    clippy::undocumented_unsafe_blocks,
    missing_docs,
    unsafe_op_in_unsafe_fn
)]

use std::process::ExitCode;

/// What the program was asked to do
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
enum Command {
    /// Tell Windows that the keyboard exists
    Register,
    /// Take the keyboard out of Windows again
    Unregister,
}

impl Command {
    /// The command in the arguments after the program's name, if they are exactly one command
    fn parse(mut arguments: impl Iterator<Item = String>) -> Option<Self> {
        let command = match arguments.next()?.as_str() {
            "register" => Some(Command::Register),
            "unregister" => Some(Command::Unregister),
            _ => None,
        };
        command.filter(|_| arguments.next().is_none())
    }

    #[cfg(windows)]
    fn run(self) -> ExitCode {
        let (result, action) = match self {
            Command::Register => (asciimath_unicode_tip::register(), "register"),
            Command::Unregister => (asciimath_unicode_tip::unregister(), "unregister"),
        };
        match result {
            Ok(()) => ExitCode::SUCCESS,
            Err(error) => {
                eprintln!("could not {action} the keyboard: {error}");
                ExitCode::FAILURE
            }
        }
    }

    #[cfg(not(windows))]
    fn run(self) -> ExitCode {
        eprintln!("{self:?} only does something on Windows");
        ExitCode::FAILURE
    }
}

fn main() -> ExitCode {
    if let Some(command) = Command::parse(std::env::args().skip(1)) {
        command.run()
    } else {
        eprintln!("usage: AsciiMathUnicode <register|unregister>");
        ExitCode::from(2)
    }
}

#[cfg(test)]
mod tests {
    use super::Command;

    fn parse(arguments: &[&str]) -> Option<Command> {
        Command::parse(arguments.iter().map(|&argument| argument.to_owned()))
    }

    #[test]
    fn commands() {
        assert_eq!(parse(&["register"]), Some(Command::Register));
        assert_eq!(parse(&["unregister"]), Some(Command::Unregister));
    }

    #[test]
    fn anything_else_is_no_command() {
        assert_eq!(parse(&[]), None);
        assert_eq!(parse(&["Register"]), None);
        assert_eq!(parse(&["options"]), None);
        assert_eq!(parse(&["register", "now"]), None);
    }
}
