/// What the document should show after a key.
public struct Outcome: Equatable, Sendable {
    /// Text to hand to the document in place of what was held.
    public var committed: String
    /// The held text to show underlined after `committed`; empty when nothing is held.
    public var marked: String
    /// Whether the app still gets the key itself.
    public var passThrough: Bool

    init(committed: String = "", marked: String = "", passThrough: Bool) {
        self.committed = committed
        self.marked = marked
        self.passThrough = passThrough
    }
}

/// Holds what is typed between the math delimiters and converts it.
///
/// Ordinary typing passes through untouched. From the first character of the opening delimiter
/// the typed text is held instead of reaching the document, and `Outcome.marked` shows it as the
/// opening delimiter followed by the math converted so far. Typing the closing delimiter hands
/// over the converted math without its delimiters. Escape, return, any `Key.other` and
/// `endInput()` hand over the held text exactly as typed, and backspace removes its last
/// character.
///
/// The delimiters follow the rules of the extension's `findSpans`: math is at least one
/// character, and a delimiter after an odd number of backslashes is plain text. The delimiter is
/// `DelimiterName.doubleDollar` unless set otherwise.
///
/// ```swift
/// var composer = Composer { math, _ in math.uppercased() }
/// composer.press(.text("$"))  // marked: "$"
/// composer.press(.text("$"))  // marked: "$$"
/// composer.press(.text("x"))  // marked: "$$X"
/// composer.press(.text("$"))  // marked: "$$X$"
/// composer.press(.text("$"))  // committed: "X"
/// ```
public struct Composer {
    /// A function that converts math to unicode, showing missing parts when `placeholders` is set.
    public typealias Convert = (_ math: String, _ placeholders: Bool) -> String

    private let convert: Convert
    private(set) var delimiter: DelimiterName
    /// Everything typed since the first character of the opening delimiter, as typed.
    private var held = ""
    /// How many backslashes are known to sit right before `held`.
    private var backslashesBefore = 0

    /// Creates a composer holding nothing, which calls `convert` on every key while it holds text.
    public init(delimiter: DelimiterName = .doubleDollar, convert: @escaping Convert) {
        self.delimiter = delimiter
        self.convert = convert
    }

    /// Whether any typed text is held, even the first half of an opening delimiter.
    public var isHolding: Bool {
        !held.isEmpty
    }

    /// Changes the delimiter, unless text is held, since that text was read with the old one.
    public mutating func setDelimiter(_ name: DelimiterName) {
        if !isHolding {
            delimiter = name
        }
    }

    private var marked: String {
        if isPendingOpener {
            held
        } else {
            delimiter.open + convert(String(content.dropLast(closerTail.count)), true) + closerTail
        }
    }

    /// Takes one key and returns what the document should now show.
    ///
    /// While nothing is held and `key` doesn't start a delimiter, the outcome is empty with
    /// `passThrough` set, so the app handles the key as if the keyboard weren't there. Otherwise:
    ///
    /// - `Key.text` is added to the held text, or handed back in `committed` if it ended the
    ///   holding, so that it lands after what was held. It is never passed through as well.
    /// - `Key.backspace` removes the last held character, back through the opening delimiter.
    /// - `Key.escape` hands over the held text as typed and is not passed through.
    /// - `Key.enter` and `Key.other` hand over the held text as typed and are passed through.
    ///
    /// `Outcome.marked` is the held text to show after the key, converted with placeholders.
    public mutating func press(_ key: Key) -> Outcome {
        switch key {
        case .text(let text):
            let wasHolding = isHolding
            var committed = ""
            for character in text {
                type(character, into: &committed)
            }
            if !wasHolding && !isHolding && committed == text {
                return Outcome(passThrough: true)
            } else {
                return Outcome(committed: committed, marked: marked, passThrough: false)
            }
        case .backspace:
            if isHolding {
                held.removeLast()
                return Outcome(marked: marked, passThrough: false)
            } else {
                backslashesBefore = max(0, backslashesBefore - 1)
                return Outcome(passThrough: true)
            }
        case .escape:
            if isHolding {
                var committed = ""
                flush(into: &committed)
                return Outcome(committed: committed, passThrough: false)
            } else {
                return Outcome(passThrough: true)
            }
        case .enter, .other:
            return Outcome(committed: endInput(), passThrough: true)
        }
    }

    /// Stops holding and returns the held text as typed, for when the caret or focus has moved.
    public mutating func endInput() -> String {
        var committed = ""
        flush(into: &committed)
        backslashesBefore = 0
        return committed
    }

    private var content: Substring {
        held.dropFirst(delimiter.open.count)
    }

    private var isPendingOpener: Bool {
        held.count < delimiter.open.count
    }

    /// The start of a closing delimiter at the end of `content`, which is shown as typed.
    private var closerTail: String {
        (1..<delimiter.close.count).reversed()
            .map { delimiter.close.prefix($0) }
            .first { tail in closes(with: tail) }
            .map(String.init) ?? ""
    }

    private static func trailingBackslashes(_ text: some StringProtocol) -> Int {
        text.reversed().prefix { $0 == "\\" }.count
    }

    /// Whether `content` is at least one character followed by an unescaped `closer`.
    private func closes(with closer: some StringProtocol) -> Bool {
        content.count > closer.count && content.hasSuffix(closer)
            && Composer.trailingBackslashes(held.dropLast(closer.count)).isMultiple(of: 2)
    }

    private mutating func type(_ character: Character, into committed: inout String) {
        if held.isEmpty {
            if delimiter.open.first == character && backslashesBefore.isMultiple(of: 2) {
                held.append(character)
            } else {
                remember(String(character))
                committed.append(character)
            }
        } else if isPendingOpener && !delimiter.open.hasPrefix(held + String(character)) {
            flush(into: &committed)
            type(character, into: &committed)
        } else {
            held.append(character)
            if closes(with: delimiter.close) {
                let converted = convert(String(content.dropLast(delimiter.close.count)), false)
                committed += converted
                remember(converted)
                held = ""
            }
        }
    }

    /// Hands over the held text as typed.
    private mutating func flush(into committed: inout String) {
        committed += held
        remember(held)
        held = ""
    }

    private mutating func remember(_ text: String) {
        let trailing = Composer.trailingBackslashes(text)
        backslashesBefore = trailing == text.count ? backslashesBefore + trailing : trailing
    }
}
