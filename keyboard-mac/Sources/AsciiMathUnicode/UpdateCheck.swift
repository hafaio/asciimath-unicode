import KeyboardKit
import SwiftUI

/// What a check for updates found.
private enum CheckResult {
    case upToDate
    case available(Version)
    case failed
}

private struct UpdateView: View {
    let result: CheckResult
    let close: () -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text(message)
            HStack {
                Spacer()
                if case .available = result {
                    Button(Copy.updateLater, role: .cancel, action: close)
                    Button(Copy.updateDownload) {
                        if let url = Updates.downloadURL {
                            NSWorkspace.shared.open(url)
                        }
                        close()
                    }
                    .keyboardShortcut(.defaultAction)
                } else {
                    Button(Copy.updateDismiss, action: close)
                        .keyboardShortcut(.defaultAction)
                }
            }
        }
        .padding(20)
        .frame(width: 360)
        .fixedSize()
    }

    private var message: String {
        switch result {
        case .upToDate: Copy.updateUpToDate
        case .available(let version): Copy.updateAvailable(version.description)
        case .failed: Copy.updateFailed
        }
    }
}

/// Checks GitHub for a newer release when asked to, and says what it found.
@MainActor
enum UpdateCheck {
    private static var window: NSWindow?
    private static var isChecking = false

    static func run() {
        if !isChecking {
            isChecking = true
            Task {
                let result = await check()
                isChecking = false
                show(result)
            }
        }
    }

    private static func check() async -> CheckResult {
        let installed = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String
        if let current = installed.flatMap(Version.init), let url = Updates.latestURL {
            var request = URLRequest(url: url, cachePolicy: .reloadIgnoringLocalCacheData)
            request.setValue("application/vnd.github+json", forHTTPHeaderField: "Accept")
            do {
                let (data, response) = try await URLSession.shared.data(for: request)
                if (response as? HTTPURLResponse)?.statusCode == 200 {
                    let latest = try Updates.latestVersion(from: data)
                    return latest > current ? .available(latest) : .upToDate
                } else {
                    return .failed
                }
            } catch {
                return .failed
            }
        } else {
            return .failed
        }
    }

    // a window rather than a modal alert, which would stop the keyboard answering keys in every
    // app until it was dismissed
    private static func show(_ result: CheckResult) {
        window?.close()
        let view = UpdateView(result: result) { close() }
        let window = NSWindow(contentViewController: NSHostingController(rootView: view))
        window.title = Copy.updateWindowTitle
        window.styleMask = [.titled, .closable]
        window.isReleasedWhenClosed = false
        window.center()
        self.window = window
        // an input method has no dock icon or menu bar to come forward with
        NSApp.activate(ignoringOtherApps: true)
        window.makeKeyAndOrderFront(nil)
    }

    private static func close() {
        window?.close()
        window = nil
        // hands the keyboard focus back to the app that was being typed in
        NSApp.deactivate()
    }
}
