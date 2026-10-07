@testable import KeyboardKit
import Testing

/// A composer that marks what it converted: `«x»` for final text, `‹x›` for text being typed.
private func makeComposer(_ delimiter: DelimiterName = .doubleDollar) -> Composer {
    Composer(delimiter: delimiter) { math, placeholders in
        placeholders ? "‹\(math)›" : "«\(math)»"
    }
}

/// What is in the document and what is still held after typing keys one at a time.
private struct Typed: Equatable {
    var document = ""
    var marked = ""
}

private func type(_ keys: [Key], into composer: inout Composer) -> Typed {
    var typed = Typed()
    for key in keys {
        let outcome = composer.press(key)
        typed.document += outcome.committed
        typed.marked = outcome.marked
        if outcome.passThrough {
            switch key {
            case .text(let text): typed.document += text
            case .backspace: typed.document.removeLast()
            case .enter: typed.document += "\n"
            case .escape, .other: break
            }
        }
    }
    return typed
}

private func keys(_ text: String) -> [Key] {
    text.map { $0 == "\n" ? .enter : .text(String($0)) }
}

private func type(_ text: String, _ delimiter: DelimiterName = .doubleDollar) -> Typed {
    var composer = makeComposer(delimiter)
    return type(keys(text), into: &composer)
}

@Test func ordinaryTypingPassesThrough() {
    var composer = makeComposer()
    for character in "plain text, with (brackets) and \\ and `" {
        #expect(composer.press(.text(String(character))) == Outcome(passThrough: true))
    }
    #expect(composer.press(.backspace) == Outcome(passThrough: true))
    #expect(composer.press(.escape) == Outcome(passThrough: true))
    #expect(composer.press(.enter) == Outcome(passThrough: true))
    #expect(composer.press(.other) == Outcome(passThrough: true))
    #expect(!composer.isHolding)
}

@Test func firstHalfOfTheOpenerIsHeld() {
    var composer = makeComposer()
    #expect(composer.press(.text("$")) == Outcome(marked: "$", passThrough: false))
    #expect(composer.isHolding)
    #expect(composer.press(.text("5")) == Outcome(committed: "$5", passThrough: false))
    #expect(!composer.isHolding)
}

@Test func typingBetweenDelimitersIsHeldAndShownConverted() {
    var composer = makeComposer()
    #expect(type(keys("a $$"), into: &composer) == Typed(document: "a ", marked: "$$‹›"))
    #expect(composer.press(.text("x")) == Outcome(marked: "$$‹x›", passThrough: false))
    #expect(composer.press(.text("^")) == Outcome(marked: "$$‹x^›", passThrough: false))
    #expect(composer.press(.text("2")) == Outcome(marked: "$$‹x^2›", passThrough: false))
}

@Test func closingDelimiterHandsOverTheFinalText() {
    var composer = makeComposer()
    _ = type(keys("$$x^2"), into: &composer)
    #expect(composer.press(.text("$")) == Outcome(marked: "$$‹x^2›$", passThrough: false))
    #expect(composer.press(.text("$")) == Outcome(committed: "«x^2»", passThrough: false))
    #expect(!composer.isHolding)
    #expect(type("see $$x^2$$ and $$y$$.") == Typed(document: "see «x^2» and «y»."))
}

@Test func halfACloserFollowedByOtherTextIsMath() {
    #expect(type("$$a$b") == Typed(marked: "$$‹a$b›"))
    #expect(type("$$a$b$$") == Typed(document: "«a$b»"))
}

@Test func mathIsAtLeastOneCharacter() {
    #expect(type("$$$$") == Typed(marked: "$$‹$›$"))
    #expect(type("$$$$$") == Typed(document: "«$»"))
    #expect(type("``", .backtick) == Typed(marked: "`‹`›"))
    #expect(type("``x`", .backtick) == Typed(document: "«`x»"))
}

@Test func escapeHandsOverWhatWasTyped() {
    var composer = makeComposer()
    _ = type(keys("$$x^2"), into: &composer)
    #expect(composer.press(.escape) == Outcome(committed: "$$x^2", passThrough: false))
    #expect(!composer.isHolding)
    #expect(composer.press(.text("$")) == Outcome(marked: "$", passThrough: false))
    #expect(composer.press(.escape) == Outcome(committed: "$", passThrough: false))
}

@Test func backspaceUndoesOneKeyAtATime() {
    var composer = makeComposer()
    _ = type(keys("$$xy$"), into: &composer)
    #expect(composer.press(.backspace) == Outcome(marked: "$$‹xy›", passThrough: false))
    #expect(composer.press(.backspace) == Outcome(marked: "$$‹x›", passThrough: false))
    #expect(composer.press(.backspace) == Outcome(marked: "$$‹›", passThrough: false))
    #expect(composer.press(.backspace) == Outcome(marked: "$", passThrough: false))
    #expect(composer.press(.backspace) == Outcome(passThrough: false))
    #expect(!composer.isHolding)
    #expect(composer.press(.backspace) == Outcome(passThrough: true))
}

@Test func backspacedOpenerCanBeTypedAgain() {
    #expect(
        {
            var composer = makeComposer()
            return type(
                keys("$$x") + [.backspace, .backspace] + keys("$y$$"), into: &composer)
        }() == Typed(document: "«y»"))
}

@Test func backspaceRemovesAWholeCharacter() {
    var composer = makeComposer()
    _ = type(keys("$$x") + [.text("👍🏽")], into: &composer)
    #expect(composer.press(.backspace) == Outcome(marked: "$$‹x›", passThrough: false))
}

@Test func returnHandsOverTheFinalText() {
    var composer = makeComposer()
    _ = type(keys("$$x^2"), into: &composer)
    #expect(composer.press(.enter) == Outcome(committed: "«x^2»", passThrough: false))
    #expect(!composer.isHolding)
    #expect(type("$$x$\ny") == Typed(document: "«x»y"))
}

@Test func returnWithoutMathEndsTheLine() {
    var composer = makeComposer()
    _ = type(keys("$$"), into: &composer)
    #expect(composer.press(.enter) == Outcome(committed: "$$", passThrough: true))
    #expect(!composer.isHolding)
}

@Test func otherKeysLeaveTheTextAsTyped() {
    var composer = makeComposer()
    _ = type(keys("$$x^2"), into: &composer)
    #expect(composer.press(.other) == Outcome(committed: "$$x^2", passThrough: true))
    _ = composer.press(.text("$"))
    #expect(composer.press(.other) == Outcome(committed: "$", passThrough: true))
}

@Test func endingInputLeavesTheTextAsTyped() {
    var composer = makeComposer()
    _ = type(keys("$$x^2$"), into: &composer)
    #expect(composer.endInput() == "$$x^2$")
    #expect(!composer.isHolding)
    #expect(composer.endInput() == "")
}

@Test func escapedDelimitersArePlainText() {
    #expect(type("\\$$") == Typed(document: "\\$", marked: "$"))
    #expect(type("\\$$x$$") == Typed(document: "\\$$x", marked: "$$‹›"))
    #expect(type("\\\\$$x$$") == Typed(document: "\\\\«x»"))
    #expect(type("$$a\\$$b") == Typed(marked: "$$‹a\\$$b›"))
    #expect(type("$$a\\$$b$$") == Typed(document: "«a\\$$b»"))
    #expect(type("$$a\\\\$$") == Typed(document: "«a\\\\»"))
}

@Test func backslashDelimiters() {
    #expect(type("\\(x^2", .paren) == Typed(marked: "\\(‹x^2›"))
    #expect(type("\\(x^2\\", .paren) == Typed(marked: "\\(‹x^2›\\"))
    #expect(type("\\(x^2\\)", .paren) == Typed(document: "«x^2»"))
    #expect(type("a\\ b \\[x\\] c", .bracket) == Typed(document: "a\\ b «x» c"))
    // the backslash of the closer is itself escaped
    #expect(type("\\(x\\\\)", .paren) == Typed(marked: "\\(‹x\\\\)›"))
    #expect(type("\\\\(x", .paren) == Typed(document: "\\\\(x"))
    #expect(type("\\\\\\(x", .paren) == Typed(document: "\\\\", marked: "\\(‹x›"))
    #expect(type("\\(a\\ b\\)", .paren) == Typed(document: "«a\\ b»"))
}

@Test func backtickDelimiter() {
    #expect(type("`", .backtick) == Typed(marked: "`‹›"))
    #expect(type("a `x^2` b", .backtick) == Typed(document: "a «x^2» b"))
}

@Test func severalCharactersInOneKey() {
    var composer = makeComposer()
    #expect(composer.press(.text("ab")) == Outcome(passThrough: true))
    #expect(composer.press(.text("$$x")) == Outcome(marked: "$$‹x›", passThrough: false))
    #expect(composer.press(.text("$$ok")) == Outcome(committed: "«x»ok", passThrough: false))
}

@Test func backslashesBeforeTheCaretAreTracked() {
    var composer = makeComposer()
    #expect(
        type(keys("\\\\") + [.backspace] + keys("$"), into: &composer) == Typed(document: "\\$"))
    _ = composer.press(.other)
    #expect(composer.press(.text("$")) == Outcome(marked: "$", passThrough: false))
}

@Test func delimiterOnlyChangesWhileNothingIsHeld() {
    var composer = makeComposer()
    _ = composer.press(.text("$"))
    composer.setDelimiter(.backtick)
    #expect(composer.delimiter == .doubleDollar)
    _ = composer.press(.escape)
    composer.setDelimiter(.backtick)
    #expect(composer.delimiter == .backtick)
    #expect(composer.press(.text("`")) == Outcome(marked: "`‹›", passThrough: false))
}
