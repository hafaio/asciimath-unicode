import Carbon.HIToolbox

/// A key press, reduced to what `Composer` acts on.
public enum Key: Equatable, Sendable {
    case text(String)
    case backspace
    case escape
    case enter
    /// Any other key: arrows, tab, shortcuts, function keys, dead keys.
    case other

    /// Creates a key from a key-down event, by its characters except for escape, return and
    /// backspace, so that every keyboard layout works.
    public init(characters: String, keyCode: Int, isShortcut: Bool) {
        if isShortcut {
            self = .other
        } else {
            switch keyCode {
            case kVK_Escape: self = .escape
            case kVK_Delete: self = .backspace
            case kVK_Return, kVK_ANSI_KeypadEnter: self = .enter
            default: self = Key.isTyped(characters) ? .text(characters) : .other
            }
        }
    }

    /// Whether `characters` is text to type rather than an arrow, function key or control key.
    private static func isTyped(_ characters: String) -> Bool {
        !characters.isEmpty
            && characters.unicodeScalars.allSatisfy { scalar in
                let category = scalar.properties.generalCategory
                return category != .control && category != .privateUse
            }
    }
}
