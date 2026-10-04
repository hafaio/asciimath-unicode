import Carbon.HIToolbox
import KeyboardKit
import Testing

@Test func charactersAreTextWhateverTheKeyCode() {
    #expect(Key(characters: "a", keyCode: kVK_ANSI_A, isShortcut: false) == .text("a"))
    #expect(Key(characters: "$", keyCode: kVK_ANSI_4, isShortcut: false) == .text("$"))
    #expect(Key(characters: "$", keyCode: kVK_ANSI_Backslash, isShortcut: false) == .text("$"))
    #expect(Key(characters: "π", keyCode: kVK_ANSI_P, isShortcut: false) == .text("π"))
    #expect(Key(characters: " ", keyCode: kVK_Space, isShortcut: false) == .text(" "))
}

@Test func editingKeysGoByKeyCode() {
    #expect(Key(characters: "\u{1b}", keyCode: kVK_Escape, isShortcut: false) == .escape)
    #expect(Key(characters: "\u{7f}", keyCode: kVK_Delete, isShortcut: false) == .backspace)
    #expect(Key(characters: "\r", keyCode: kVK_Return, isShortcut: false) == .enter)
    #expect(Key(characters: "\u{3}", keyCode: kVK_ANSI_KeypadEnter, isShortcut: false) == .enter)
}

@Test func everythingElseIsOther() {
    #expect(Key(characters: "\u{F702}", keyCode: kVK_LeftArrow, isShortcut: false) == .other)
    #expect(Key(characters: "\u{F728}", keyCode: kVK_ForwardDelete, isShortcut: false) == .other)
    #expect(Key(characters: "\t", keyCode: kVK_Tab, isShortcut: false) == .other)
    #expect(Key(characters: "", keyCode: kVK_ANSI_E, isShortcut: false) == .other)
    #expect(Key(characters: "v", keyCode: kVK_ANSI_V, isShortcut: true) == .other)
    #expect(Key(characters: "\r", keyCode: kVK_Return, isShortcut: true) == .other)
}
