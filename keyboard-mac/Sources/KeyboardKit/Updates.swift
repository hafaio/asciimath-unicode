public import Foundation

/// A version number: dot-separated whole numbers, like `0.10.0`.
public struct Version: Comparable, Hashable, Sendable, CustomStringConvertible {
    /// The numbers without trailing zeros, so that `1.0` equals `1`.
    private let parts: [Int]

    /// The version as it was written.
    public let description: String

    /// Reads a version, or returns nil for anything but dot-separated runs of digits.
    public init?(_ text: String) {
        let fields = text.split(separator: ".", omittingEmptySubsequences: false)
        let numbers = fields.compactMap { field in
            field.allSatisfy { ("0"..."9").contains($0) } ? Int(field) : nil
        }
        if numbers.count == fields.count {
            parts = Array(numbers.reversed().drop { $0 == 0 }.reversed())
            description = text
        } else {
            return nil
        }
    }

    /// Orders versions number by number, so that `0.9.0` comes before `0.10.0`.
    public static func < (left: Version, right: Version) -> Bool {
        left.parts.lexicographicallyPrecedes(right.parts)
    }

    /// Compares versions number by number, so that `1.0` equals `1`.
    public static func == (left: Version, right: Version) -> Bool {
        left.parts == right.parts
    }

    /// Hashes the same numbers that `==` compares.
    public func hash(into hasher: inout Hasher) {
        hasher.combine(parts)
    }
}

/// Reads the keyboard's newest released version from GitHub.
///
/// The repository's latest release is always the keyboard's: its tag is `keyboard-v` followed by
/// the version, and its installer is attached under a name that doesn't change, so
/// `downloadURL` always fetches the newest one. The extension's releases, tagged differently,
/// are never marked latest.
public enum Updates {
    /// The address that describes the repository's latest release.
    public static let latestURL = URL(
        string: "https://api.github.com/repos/hafacc/asciimath-unicode/releases/latest")

    /// The address the latest release's installer downloads from.
    public static let downloadURL = URL(
        string:
            "https://github.com/hafacc/asciimath-unicode/releases/latest/download/AsciiMathUnicode.pkg"
    )

    /// The error for a release whose tag isn't `keyboard-v` followed by a version.
    public struct NotKeyboardReleaseError: Error {}

    private struct Release: Decodable {
        var tag: String

        private enum CodingKeys: String, CodingKey {
            case tag = "tag_name"
        }
    }

    private static let tagPrefix = "keyboard-v"

    /// Reads the released version from the body of a response from `latestURL`.
    ///
    /// - Throws: A decoding error if `data` isn't a release, or `NotKeyboardReleaseError` if the
    ///   release isn't the keyboard's.
    public static func latestVersion(from data: Data) throws -> Version {
        let tag = try JSONDecoder().decode(Release.self, from: data).tag
        if tag.hasPrefix(tagPrefix), let version = Version(String(tag.dropFirst(tagPrefix.count))) {
            return version
        } else {
            throw NotKeyboardReleaseError()
        }
    }
}
