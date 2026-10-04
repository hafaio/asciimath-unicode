import Foundation
import KeyboardKit
import Testing

private func withDefaults(_ body: (UserDefaults) -> Void) {
    let suite = "KeyboardKitTests.\(UUID().uuidString)"
    let defaults = UserDefaults(suiteName: suite)!
    defer { defaults.removePersistentDomain(forName: suite) }
    body(defaults)
}

@Test func defaultsMatchTheExtension() {
    withDefaults { defaults in
        let settings = Settings(defaults: defaults)
        #expect(settings == Settings())
        #expect(settings.delimiter == .doubleDollar)
        #expect(settings.pruneParens)
        #expect(settings.vulgarFractions)
        #expect(settings.scriptFractions)
        #expect(settings.skinTone == .none)
    }
}

@Test func storedSettingsAreRead() {
    withDefaults { defaults in
        defaults.set("backtick", forKey: SettingsKey.delimiter)
        defaults.set(false, forKey: SettingsKey.pruneParens)
        defaults.set(false, forKey: SettingsKey.vulgarFractions)
        defaults.set(false, forKey: SettingsKey.scriptFractions)
        defaults.set("MediumDark", forKey: SettingsKey.skinTone)
        var expected = Settings()
        expected.delimiter = .backtick
        expected.pruneParens = false
        expected.vulgarFractions = false
        expected.scriptFractions = false
        expected.skinTone = .mediumDark
        #expect(Settings(defaults: defaults) == expected)
    }
}

@Test func invalidSettingsFallBackToTheDefault() {
    withDefaults { defaults in
        defaults.set("dollar", forKey: SettingsKey.delimiter)
        defaults.set("yes please", forKey: SettingsKey.pruneParens)
        defaults.set(7, forKey: SettingsKey.skinTone)
        defaults.set(false, forKey: SettingsKey.vulgarFractions)
        var expected = Settings()
        expected.vulgarFractions = false
        #expect(Settings(defaults: defaults) == expected)
    }
}

@Test func delimiterTableMatchesTheExtension() {
    #expect(
        DelimiterName.allCases.map(\.rawValue) == [
            "doubleDollar", "paren", "bracket", "backtick",
        ])
    #expect(
        DelimiterName.allCases.map(\.display) == [
            "$$x$$", "\\(x\\)", "\\[x\\]", "`x`",
        ])
    #expect(
        SkinTone.allCases.map(\.rawValue) == [
            "Default", "Light", "MediumLight", "Medium", "MediumDark", "Dark",
        ])
    #expect(SkinTone.allCases.map(\.number) == [0, 1, 2, 3, 4, 5])
}
