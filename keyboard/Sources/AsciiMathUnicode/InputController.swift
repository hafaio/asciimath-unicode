import AsciiMathCore
import Cocoa
import InputMethodKit
import KeyboardKit

@objc(AsciiMathInputController)
final class InputController: IMKInputController {
    /// The range that makes the client replace the held text, or the selection if none is held.
    private static let heldText = NSRange(location: NSNotFound, length: NSNotFound)

    private var composer = Composer { math, placeholders in
        let settings = KeyboardKit.Settings(defaults: .standard)
        return convert(
            math,
            stripBrackets: settings.pruneParens,
            vulgarFractions: settings.vulgarFractions,
            scriptFractions: settings.scriptFractions,
            skinTone: settings.skinTone.number,
            placeholders: placeholders
        )
    }

    override func recognizedEvents(_ sender: Any!) -> Int {
        Int(NSEvent.EventTypeMask.keyDown.rawValue)
    }

    override func handle(_ event: NSEvent!, client sender: Any!) -> Bool {
        if let event, event.type == .keyDown, let client = sender as? any IMKTextInput {
            composer.setDelimiter(KeyboardKit.Settings(defaults: .standard).delimiter)
            let wasHolding = composer.isHolding
            let outcome = composer.press(
                Key(
                    characters: event.characters ?? "",
                    keyCode: Int(event.keyCode),
                    isShortcut: !event.modifierFlags.isDisjoint(with: [.command, .control])
                ))
            if !outcome.committed.isEmpty {
                client.insertText(outcome.committed, replacementRange: Self.heldText)
            }
            if !outcome.marked.isEmpty || (wasHolding && outcome.committed.isEmpty) {
                show(marked: outcome.marked, in: client)
            }
            return !outcome.passThrough
        } else {
            return false
        }
    }

    /// Hands over the held text as typed when the client says typing can't continue there.
    override func commitComposition(_ sender: Any!) {
        let committed = composer.endInput()
        if !committed.isEmpty, let client = sender as? any IMKTextInput {
            client.insertText(committed, replacementRange: Self.heldText)
        }
    }

    override func deactivateServer(_ sender: Any!) {
        commitComposition(sender)
        super.deactivateServer(sender)
    }

    override func menu() -> NSMenu! {
        let menu = NSMenu()
        menu.addItem(
            withTitle: Copy.settingsMenuItem, action: #selector(showSettings(_:)), keyEquivalent: ""
        )
        menu.addItem(
            withTitle: Copy.updateMenuItem, action: #selector(checkForUpdates(_:)),
            keyEquivalent: ""
        )
        return menu
    }

    @MainActor @objc private func showSettings(_ sender: Any?) {
        SettingsWindow.show()
    }

    @MainActor @objc private func checkForUpdates(_ sender: Any?) {
        UpdateCheck.run()
    }

    private func show(marked: String, in client: any IMKTextInput) {
        let underlined = NSAttributedString(
            string: marked,
            attributes: [
                .underlineStyle: NSUnderlineStyle.single.rawValue,
                .markedClauseSegment: 0,
            ])
        client.setMarkedText(
            underlined,
            // the caret only ever sits at the end
            selectionRange: NSRange(location: underlined.length, length: 0),
            replacementRange: Self.heldText
        )
    }
}
