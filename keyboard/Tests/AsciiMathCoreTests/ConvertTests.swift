import AsciiMathCore
import Testing

private func convert(_ math: String, scriptFractions: Bool = true, skinTone: UInt8 = 0) -> String {
    AsciiMathCore.convert(
        math,
        stripBrackets: true,
        vulgarFractions: true,
        scriptFractions: scriptFractions,
        skinTone: skinTone,
        placeholders: false
    )
}

@Test func convertsThroughTheRustLibrary() {
    #expect(convert("sum_(i=1)^n i^3=((n(n+1))/2)^2") == "∑ᵢ₌₁ⁿ i³=(ⁿ⁽ⁿ⁺¹⁾⁄₂)²")
    #expect(convert("") == "")
    #expect(convert("α^2") == "α²")
}

@Test func passesTheOptionsOn() {
    #expect(convert("y/x") == "ʸ⁄ₓ")
    #expect(convert("y/x", scriptFractions: false) == "y/x")
    #expect(convert(":hand:", skinTone: 5) == "✋🏿")
}
