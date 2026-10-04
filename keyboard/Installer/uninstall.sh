#!/bin/sh
# Removes the keyboard that the installer package put in /Library/Input Methods:
#
#   sudo "/Library/Input Methods/AsciiMathUnicode.app/Contents/Resources/uninstall.sh"
#
# With --settings it also deletes the options of the user who runs it.
set -eu

identifier="cc.hafa.inputmethod.AsciiMathUnicode"
# stands in for / when testing; with it set, nothing outside it is touched
root="${UNINSTALL_ROOT:-}"

# for the steps that are fine to fail: nothing running, no receipt, no options saved
attempt() {
  if [ -n "$root" ]; then
    echo "would run: $*"
  else
    "$@" > /dev/null 2>&1 || true
  fi
}

# a function, so that the shell has read all of it before this file is deleted
main() {
  settings=false
  for argument in "$@"; do
    case "$argument" in
      --settings) settings=true ;;
      *)
        echo "usage: uninstall.sh [--settings]" >&2
        exit 2
        ;;
    esac
  done

  if [ -z "$root" ] && [ "$(id -u)" -ne 0 ]; then
    echo "error: removing from /Library needs root; run this with sudo" >&2
    exit 1
  fi

  attempt killall AsciiMathUnicode
  rm -rf "$root/Library/Input Methods/AsciiMathUnicode.app"
  attempt pkgutil --forget "$identifier"
  if $settings; then
    # under sudo the options are those of the user who called it, not root's
    if [ -n "${SUDO_USER:-}" ]; then
      attempt sudo -u "$SUDO_USER" defaults delete "$identifier"
    else
      attempt defaults delete "$identifier"
    fi
  fi

  echo "Removed Ascii Math Unicode. Two things are left for you:"
  echo "  1. Remove it in System Settings > Keyboard > Text Input > Edit."
  echo "  2. Log out and back in."
  exit 0
}

main "$@"
