import CAsciiMathCore

/// What the document should show after a key.
public struct Outcome: Equatable, Sendable {
    /// Text to hand to the document in place of what was held.
    public var committed: String
    /// The held text to show underlined after `committed`; empty when nothing is held.
    public var marked: String
    /// Whether the app still gets the key itself.
    public var passThrough: Bool

    /// Creates an outcome from its parts.
    public init(committed: String = "", marked: String = "", passThrough: Bool) {
        self.committed = committed
        self.marked = marked
        self.passThrough = passThrough
    }
}

/// How math is read and converted.
public struct ComposerOptions: Equatable, Sendable {
    /// The delimiter that math is typed between, numbered as in `asciimath_core.h`.
    public var delimiter: UInt8
    /// Drops ( ), [ ] and { } that only group a fraction, script or argument.
    public var stripBrackets: Bool
    /// Writes fractions that have a character of their own, like ½, with it.
    public var vulgarFractions: Bool
    /// Writes other fractions as a superscript over a subscript, like ʸ⁄ₓ.
    public var scriptFractions: Bool
    /// The tone for emoji that take one, numbered as in `asciimath_core.h`; 0 is none.
    public var skinTone: UInt8

    /// Creates options from their parts, which default to those of a fresh install.
    public init(
        delimiter: UInt8 = 0,
        stripBrackets: Bool = true,
        vulgarFractions: Bool = true,
        scriptFractions: Bool = true,
        skinTone: UInt8 = 0
    ) {
        self.delimiter = delimiter
        self.stripBrackets = stripBrackets
        self.vulgarFractions = vulgarFractions
        self.scriptFractions = scriptFractions
        self.skinTone = skinTone
    }
}

/// Holds what is typed between the math delimiters and converts it.
///
/// This is the Swift face of the composer in the Rust library `keyboard-core`, which keyboards on
/// other platforms share. Ordinary typing passes through untouched. From the first character of
/// the opening delimiter the typed text is held instead of reaching the document, and
/// `Outcome.marked` shows it as the opening delimiter followed by the math converted so far.
/// Typing the closing delimiter hands over the converted math without its delimiters, and so does
/// return once there is math. Escape, any other key that isn't text and `endInput()` hand over the
/// held text exactly as typed, and backspace removes its last character.
///
/// ```swift
/// let composer = Composer()
/// let options = ComposerOptions()
/// composer.press(characters: "$", keyCode: 21, isShortcut: false, options: options)
/// composer.press(characters: "$", keyCode: 21, isShortcut: false, options: options)
/// // marked: "$$"
/// composer.press(characters: "x", keyCode: 7, isShortcut: false, options: options)
/// // marked: "$$x"
/// ```
@safe public final class Composer {
    // only this class sees the handle, and it lives exactly as long as the class does
    private let handle: OpaquePointer

    /// Creates a composer holding nothing.
    public init() {
        unsafe handle = unsafe asciimath_composer_new()
    }

    deinit {
        // SAFETY: the handle came from `asciimath_composer_new` and is released once, here
        unsafe asciimath_composer_free(handle)
    }

    /// Whether any typed text is held, even the first half of an opening delimiter.
    public var isHolding: Bool {
        // SAFETY: the handle is live until `deinit`, and nothing else uses it during the call
        unsafe asciimath_composer_is_holding(handle)
    }

    /// Takes the key of a key-down event and returns what the document should now show.
    ///
    /// While nothing is held and the key doesn't start a delimiter, the outcome is empty with
    /// `passThrough` set, so the app handles the key as if the keyboard weren't there.
    ///
    /// - Parameters:
    ///   - characters: The event's characters. Escape, return and backspace go by `keyCode`
    ///     instead, so that every keyboard layout works.
    ///   - keyCode: The event's virtual key code.
    ///   - isShortcut: Whether command or control was held.
    ///   - options: How math is read and converted. Its delimiter takes effect once nothing is
    ///     held, since held text was read with the old one.
    /// - Returns: The text to commit and to show as held, and whether the app gets the key.
    public func press(
        characters: String, keyCode: UInt16, isShortcut: Bool, options: ComposerOptions
    ) -> Outcome {
        // SAFETY: the handle is live and unshared, the string passed in is nul-terminated and
        // outlives the call, and the outcome's strings are read once and released once
        let outcome = unsafe asciimath_composer_press_mac(
            handle, characters, keyCode, isShortcut,
            AsciimathOptions(
                delimiter: options.delimiter,
                strip_brackets: options.stripBrackets,
                vulgar_fracs: options.vulgarFractions,
                script_fracs: options.scriptFractions,
                skin_tone: options.skinTone
            ))
        defer { unsafe asciimath_outcome_free(outcome) }
        return unsafe Outcome(
            committed: String(cString: outcome.committed),
            marked: String(cString: outcome.marked),
            passThrough: outcome.pass_through
        )
    }

    /// Stops holding and returns the held text as typed, for when the caret or focus has moved.
    public func endInput() -> String {
        // SAFETY: the handle is live and unshared, and the result is read once and released once
        let held = unsafe asciimath_composer_end_input(handle)
        defer { unsafe asciimath_free(held) }
        return unsafe String(cString: held)
    }
}
