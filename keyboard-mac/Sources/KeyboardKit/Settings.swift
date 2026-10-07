public import Foundation

/// A skin tone for emoji.
///
/// Raw values are the names the extension stores.
public enum SkinTone: String, CaseIterable, Sendable {
    case none = "Default"
    case light = "Light"
    case mediumLight = "MediumLight"
    case medium = "Medium"
    case mediumDark = "MediumDark"
    case dark = "Dark"

    /// The tone's number in `asciimath_core.h`.
    public var number: UInt8 {
        switch self {
        case .none: 0
        case .light: 1
        case .mediumLight: 2
        case .medium: 3
        case .mediumDark: 4
        case .dark: 5
        }
    }
}

/// The names the settings are stored under, the same as the extension's.
public enum SettingsKey {
    /// Key for `Settings.delimiter`.
    public static let delimiter = "delimiter"
    /// Key for `Settings.pruneParens`.
    public static let pruneParens = "pruneParens"
    /// Key for `Settings.vulgarFractions`.
    public static let vulgarFractions = "vulgarFractions"
    /// Key for `Settings.scriptFractions`.
    public static let scriptFractions = "scriptFractions"
    /// Key for `Settings.skinTone`.
    public static let skinTone = "skinTone"
}

/// The keyboard's settings, with the extension's defaults.
public struct Settings: Equatable, Sendable {
    /// The markers that math is typed between.
    public var delimiter = DelimiterName.doubleDollar
    /// Drops ( ), [ ] and { } that only group a fraction, script or argument.
    public var pruneParens = true
    /// Writes fractions that have a character of their own, like ½, with it.
    public var vulgarFractions = true
    /// Writes other fractions as a superscript over a subscript, like ʸ⁄ₓ.
    public var scriptFractions = true
    /// The skin tone for emoji that take one.
    public var skinTone = SkinTone.none

    /// Creates the default settings.
    public init() {}

    /// Reads the stored settings, using the default for each missing or invalid one.
    public init(defaults: UserDefaults) {
        self.init()
        delimiter =
            defaults.string(forKey: SettingsKey.delimiter).flatMap(DelimiterName.init) ?? delimiter
        pruneParens = defaults.object(forKey: SettingsKey.pruneParens) as? Bool ?? pruneParens
        vulgarFractions =
            defaults.object(forKey: SettingsKey.vulgarFractions) as? Bool ?? vulgarFractions
        scriptFractions =
            defaults.object(forKey: SettingsKey.scriptFractions) as? Bool ?? scriptFractions
        skinTone = defaults.string(forKey: SettingsKey.skinTone).flatMap(SkinTone.init) ?? skinTone
    }
}
