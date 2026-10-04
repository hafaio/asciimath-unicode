import Foundation
import KeyboardKit
import Testing

private func version(_ text: String) throws -> Version {
    try #require(Version(text))
}

private func latestVersion(_ body: String) throws -> Version {
    try Updates.latestVersion(from: Data(body.utf8))
}

@Test func versionsParse() throws {
    #expect(try version("0.1.0").description == "0.1.0")
    #expect(Version("1") != nil)
    #expect(Version("10.20.30.40") != nil)
    for malformed in [
        "", ".", "1.", ".1", "1..2", "v1.0", "1.0-beta", "1.0 ", "1.a", "-1.0", "١.٢",
    ] {
        #expect(Version(malformed) == nil, "\(malformed)")
    }
    #expect(Version("99999999999999999999999.0") == nil)
}

@Test func versionsCompareByNumber() throws {
    #expect(try version("0.9.0") < version("0.10.0"))
    #expect(try version("0.10.0") > version("0.9.9"))
    #expect(try version("1.0.0") > version("0.99.99"))
    #expect(try version("0.1.0") < version("0.1.1"))
    #expect(try version("0.1") < version("0.1.1"))
    #expect(try version("2") > version("1.9"))
    #expect(try version("01.2") == version("1.2"))
}

@Test func trailingZerosDoNotCount() throws {
    #expect(try version("1.0") == version("1"))
    #expect(try version("0.1.0") == version("0.1"))
    #expect(try !(version("0.1.0") < version("0.1")))
    #expect(try version("1.0").hashValue == version("1").hashValue)
    #expect(try version("1.0") != version("1.0.1"))
}

@Test func latestVersionComesFromTheTag() throws {
    #expect(try latestVersion("{\"tag_name\": \"keyboard-v0.2.0\"}") == version("0.2.0"))
    let release = """
        {"url": "https://api.github.com/repos/hafacc/asciimath-unicode/releases/1", "id": 1,
         "tag_name": "keyboard-v0.10.0", "name": null, "draft": false, "prerelease": false,
         "assets": [{"name": "AsciiMathUnicode.pkg", "size": 1}], "body": "notes"}
        """
    #expect(try latestVersion(release) == version("0.10.0"))
    #expect(try latestVersion(release) > version("0.9.0"))
}

@Test func otherTagsAreNotTheKeyboards() {
    let tags = [
        "v4.0.1", "keyboard-v", "keyboard-v1.0-beta", "keyboard-vnext", "keyboard-0.5.0",
        "Keyboard-v0.6.0", "extension-keyboard-v0.7.0", "",
    ]
    for tag in tags {
        #expect(throws: Updates.NotKeyboardReleaseError.self, "\(tag)") {
            try latestVersion("{\"tag_name\": \"\(tag)\"}")
        }
    }
}

@Test func unexpectedJSONFails() {
    let bodies = [
        "", "[]", "{}", "{\"message\": \"Not Found\", \"status\": \"404\"}",
        "{\"message\": \"API rate limit exceeded\"}", "{\"tag_name\": 3}",
        "[{\"tag_name\": \"keyboard-v0.2.0\"}]",
    ]
    for body in bodies {
        #expect(throws: DecodingError.self, "\(body)") {
            try latestVersion(body)
        }
    }
}

@Test func addressesPointAtTheLatestRelease() {
    #expect(
        Updates.latestURL?.absoluteString
            == "https://api.github.com/repos/hafacc/asciimath-unicode/releases/latest")
    #expect(
        Updates.downloadURL?.absoluteString
            == "https://github.com/hafacc/asciimath-unicode/releases/latest/download/AsciiMathUnicode.pkg"
    )
}
