/// A pair of math markers, from the same table as the extension's `delimiters.ts`.
///
/// Raw values are the names the setting is stored under.
public enum DelimiterName: String, CaseIterable, Sendable {
    case doubleDollar
    case paren
    case bracket
    case backtick

    /// The text that starts math.
    public var open: String {
        switch self {
        case .doubleDollar: "$$"
        case .paren: "\\("
        case .bracket: "\\["
        case .backtick: "`"
        }
    }

    /// The text that ends math.
    public var close: String {
        switch self {
        case .doubleDollar: "$$"
        case .paren: "\\)"
        case .bracket: "\\]"
        case .backtick: "`"
        }
    }

    /// The delimiter's number in `asciimath_core.h`.
    public var number: UInt8 {
        switch self {
        case .doubleDollar: 0
        case .paren: 1
        case .bracket: 2
        case .backtick: 3
        }
    }

    /// The markers around an x, as shown in the settings.
    public var display: String {
        "\(open)x\(close)"
    }
}
