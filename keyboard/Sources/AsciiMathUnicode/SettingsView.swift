import KeyboardKit
import SwiftUI

struct SettingsView: View {
    private static let defaults = KeyboardKit.Settings()

    @AppStorage(SettingsKey.delimiter) private var delimiter = defaults.delimiter
    @AppStorage(SettingsKey.pruneParens) private var pruneParens = defaults.pruneParens
    @AppStorage(SettingsKey.vulgarFractions) private var vulgarFractions = defaults.vulgarFractions
    @AppStorage(SettingsKey.scriptFractions) private var scriptFractions = defaults.scriptFractions
    @AppStorage(SettingsKey.skinTone) private var skinTone = defaults.skinTone

    var body: some View {
        Form {
            Picker(Copy.delimiter, selection: $delimiter) {
                ForEach(DelimiterName.allCases, id: \.self) { name in
                    Text(name.display).monospaced()
                }
            }
            Toggle(Copy.pruneParens, isOn: $pruneParens)
            Toggle(Copy.vulgarFractions, isOn: $vulgarFractions)
            Toggle(Copy.scriptFractions, isOn: $scriptFractions)
            Picker(Copy.skinTone, selection: $skinTone) {
                ForEach(SkinTone.allCases, id: \.self) { tone in
                    Text(Copy.skinToneName(tone))
                }
            }
        }
        .formStyle(.grouped)
        .frame(width: 480)
        .fixedSize()
    }
}

@MainActor
enum SettingsWindow {
    private static var window: NSWindow?

    static func show() {
        let window = window ?? makeWindow()
        self.window = window
        // an input method has no dock icon or menu bar to come forward with
        NSApp.activate(ignoringOtherApps: true)
        window.makeKeyAndOrderFront(nil)
    }

    private static func makeWindow() -> NSWindow {
        let window = NSWindow(contentViewController: NSHostingController(rootView: SettingsView()))
        window.title = Copy.settingsWindowTitle
        window.styleMask = [.titled, .closable]
        window.isReleasedWhenClosed = false
        window.center()
        return window
    }
}
