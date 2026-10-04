import CAsciiMathCore

/// Converts ascii math to unicode.
///
/// This is the Swift face of `asciimath_convert` in the Rust library `keyboard/core`, which the
/// extension's binding mirrors, so both convert the same way. All of `math` is read as math and
/// every string converts; one that can't cross the C boundary comes back unchanged.
///
/// - Parameters:
///   - math: The ascii math, without delimiters.
///   - stripBrackets: Drops ( ), [ ] and { } that only group a fraction, script or argument.
///   - vulgarFractions: Writes fractions that have a character of their own, like ½, with it.
///   - scriptFractions: Writes other fractions as a superscript over a subscript, like ʸ⁄ₓ,
///     instead of with a plain slash.
///   - skinTone: The tone for emoji that take one, numbered as in `asciimath_core.h`; 0 is none.
///   - placeholders: Shows missing parts, like `x⸋` for `x^`, for math that is still being typed.
/// - Returns: The math as unicode text.
public func convert(
    _ math: String,
    stripBrackets: Bool,
    vulgarFractions: Bool,
    scriptFractions: Bool,
    skinTone: UInt8,
    placeholders: Bool
) -> String {
    // SAFETY: the string passed in is nul-terminated and outlives the call, and the result is read
    // once and released once
    let converted = unsafe asciimath_convert(
        math, stripBrackets, vulgarFractions, scriptFractions, skinTone, placeholders)
    defer { unsafe asciimath_free(converted) }
    // only text with a nul in it comes back null, and that can't be typed
    return unsafe converted.map { unsafe String(cString: $0) } ?? math
}
