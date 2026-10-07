import KeyboardKit

/// Every string a user of the keyboard reads, except the name in Info.plist.
///
/// The wording is the extension's (`extension/src/copy.ts` and `extension/options.html`).
enum Copy {
    static let settingsMenuItem = "Options"
    static let settingsWindowTitle = "Ascii Math Unicode Options"
    static let delimiter = "Math markers"
    static let pruneParens = "Drop parentheses that fractions and scripts already imply"
    static let vulgarFractions = "Use single-character fractions like ½"
    static let scriptFractions = "Write fractions with super- and subscripts, like ¹⁄₂"
    static let skinTone = "Skin tone for :emoji:"
    static let updateMenuItem = "Check for updates"
    static let updateWindowTitle = "Ascii Math Unicode"
    static let updateUpToDate = "Ascii Math Unicode is up to date."
    static let updateFailed = "Couldn't check for updates"
    static let updateDownload = "Download"
    static let updateLater = "Not now"
    static let updateDismiss = "OK"

    static func updateAvailable(_ version: String) -> String {
        "Version \(version) of Ascii Math Unicode is available."
    }

    static func skinToneName(_ tone: SkinTone) -> String {
        switch tone {
        case .none: "No skin tone"
        case .light: "Light skin tone"
        case .mediumLight: "Medium-light skin tone"
        case .medium: "Medium skin tone"
        case .mediumDark: "Medium-dark skin tone"
        case .dark: "Dark skin tone"
        }
    }
}
