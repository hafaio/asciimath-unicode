#!/bin/sh
# Builds the installer package from an archive. The AsciiMathUnicode scheme runs this after
# Archive; Xcode hides what such a step prints and ignores whether it fails, so everything goes
# to a log beside the package, which is kept, and opened, only on failure.
set -u

output="$SRCROOT/build"
log="$output/package.log"
mkdir -p "$output"

# only the Xcode window, not xcodebuild, has someone to show things to
in_xcode() {
  [ "${__CFBundleIdentifier:-}" = "com.apple.dt.Xcode" ]
}

package() {
  set -e
  root="$ARCHIVE_PRODUCTS_PATH"
  app="$root/Library/Input Methods/AsciiMathUnicode.app"
  version="$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$app/Contents/Info.plist")"
  identifier="$(/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "$app/Contents/Info.plist")"
  package="$output/AsciiMathUnicode-$version.pkg"
  work="$(mktemp -d)"
  trap 'rm -rf "$work"' EXIT

  # a relocatable bundle is installed over any other copy the system knows of, wherever it is
  pkgbuild --analyze --root "$root" "$work/component.plist"
  plutil -replace 0.BundleIsRelocatable -bool NO "$work/component.plist"

  # set INSTALLER_SIGN_IDENTITY as a build setting to choose among several identities
  identity="${INSTALLER_SIGN_IDENTITY:-}"
  if [ -z "$identity" ]; then
    identity="$(security find-identity -v -p basic |
      sed -n 's/.*"\(Developer ID Installer: [^"]*\)".*/\1/p' | head -n 1)"
  fi
  if [ -n "$identity" ]; then
    echo "signing the package as: $identity"
    set -- --sign "$identity"
  else
    echo "note: no Developer ID Installer identity found; the package is unsigned"
    set --
  fi

  rm -f "$package"
  pkgbuild --root "$root" --component-plist "$work/component.plist" \
    --identifier "$identifier" --version "$version" --install-location / \
    --ownership recommended --scripts "$SRCROOT/Installer/scripts" "$@" "$package"
  echo "package: $package"
  if in_xcode; then
    open -R "$package"
  fi
}

# not in a condition, where the shell would ignore `set -e` inside
(package) > "$log" 2>&1
status=$?
if [ $status -eq 0 ]; then
  rm "$log"
else
  echo "error: building the package failed" >> "$log"
  if in_xcode; then
    open "$log"
  fi
fi
exit $status
