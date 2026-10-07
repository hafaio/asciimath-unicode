//! Taking each key once, though Windows asks about it before sending it

use keyboard_core::{Composer, Convert, Delimiter, Key, Outcome};

/// A key that was passed through, kept past its event
#[derive(Debug, Clone, PartialEq, Eq)]
struct Passed {
    stamp: u64,
    /// The text of a [`Key::Text`]
    text: Option<String>,
    /// The key with any text dropped
    kind: Key<'static>,
}

impl Passed {
    fn new(key: Key<'_>, stamp: u64) -> Self {
        let (text, kind) = match key {
            Key::Text(text) => (Some(text.to_owned()), Key::Text("")),
            Key::Backspace => (None, Key::Backspace),
            Key::Escape => (None, Key::Escape),
            Key::Enter => (None, Key::Enter),
            Key::Other => (None, Key::Other),
        };
        Passed { stamp, text, kind }
    }
}

/// A [`Composer`] for a host that asks whether a key will be eaten before sending it
///
/// Windows first asks a keyboard whether it wants a key ([`test`][Session::test]) and only sends
/// the key itself ([`press`][Session::press]) if it does. The question must not change what is
/// held, but a key the keyboard doesn't want never arrives, though the composer has to see it.
/// So a tested key is tried on a copy of the composer: if the key would be eaten the copy is
/// dropped and `press` does the work, and if not the copy is kept.
///
/// Apps differ in which of the two they call, and some call both for a key that isn't eaten. Each
/// call takes a `stamp`, a number that is the same for every call about one key event and differs
/// from the events around it, and a key that was already passed through under its stamp changes
/// nothing a second time. [`release`][Session::release] forgets the stamp, for when the key
/// comes up, since a key that repeats while held down sends no such event in between.
///
/// ```
/// use asciimath_unicode_tip::Session;
/// use keyboard_core::Key;
/// let convert = |math: &str, _placeholders: bool| math.to_uppercase();
/// let mut session = Session::default();
/// assert!(session.test(Key::Text("a"), 1, &convert).is_some());
/// assert!(session.test(Key::Text("$"), 2, &convert).is_none());
/// assert_eq!(session.press(Key::Text("$"), 2, &convert).marked, "$");
/// ```
#[derive(Debug, Default, Clone, PartialEq, Eq)]
pub struct Session {
    composer: Composer,
    /// The last key that was passed through, which its own event must not apply again
    passed: Option<Passed>,
}

impl Session {
    /// Whether any typed text is held, even the first half of an opening delimiter
    #[must_use]
    pub fn is_holding(&self) -> bool {
        self.composer.is_holding()
    }

    /// Change the delimiter, unless text is held, since that text was read with the old one
    pub fn set_delimiter(&mut self, delimiter: Delimiter) {
        self.composer.set_delimiter(delimiter);
    }

    /// Whether `key` starts holding under some delimiter, which is when the settings can matter
    #[must_use]
    pub fn could_open(key: Key<'_>) -> bool {
        if let Key::Text(text) = key {
            Delimiter::ALL.into_iter().any(|delimiter| {
                text.chars()
                    .any(|character| delimiter.open().starts_with(character))
            })
        } else {
            false
        }
    }

    /// Say whether `key` would be eaten, taking it now if it wouldn't
    ///
    /// `None` means the key would be eaten: nothing has changed, and
    /// [`press`][Session::press] says what it does. Otherwise the key goes on to the app and this
    /// is its outcome, which has been applied, with whatever was held in
    /// [`Outcome::committed`].
    pub fn test(&mut self, key: Key<'_>, stamp: u64, convert: Convert<'_>) -> Option<Outcome> {
        let passed = Passed::new(key, stamp);
        if self.passed.as_ref() == Some(&passed) {
            Some(already_passed())
        } else {
            let mut trial = self.composer.clone();
            let outcome = trial.press(key, convert);
            if outcome.pass_through {
                self.composer = trial;
                self.passed = Some(passed);
                Some(outcome)
            } else {
                None
            }
        }
    }

    /// Take one key and return what the document should now show, as [`Composer::press`] does
    ///
    /// A key that [`test`][Session::test] already passed through under the same `stamp` is passed
    /// through again without changing anything.
    pub fn press(&mut self, key: Key<'_>, stamp: u64, convert: Convert<'_>) -> Outcome {
        let passed = Passed::new(key, stamp);
        if self.passed.as_ref() == Some(&passed) {
            already_passed()
        } else {
            let outcome = self.composer.press(key, convert);
            self.passed = outcome.pass_through.then_some(passed);
            outcome
        }
    }

    /// Forget which key was last passed through, for when a key comes up
    pub fn release(&mut self) {
        self.passed = None;
    }

    /// Stop holding and return the held text as typed, for when the caret or focus has moved
    pub fn end_input(&mut self) -> String {
        self.passed = None;
        self.composer.end_input()
    }
}

fn already_passed() -> Outcome {
    Outcome {
        pass_through: true,
        ..Outcome::default()
    }
}

#[cfg(test)]
mod tests {
    use super::{Session, already_passed};
    use keyboard_core::{Delimiter, Key, Outcome};

    /// Marks what it converted: `«x»` for final text, `‹x›` for text being typed
    fn mark(math: &str, placeholders: bool) -> String {
        if placeholders {
            format!("‹{math}›")
        } else {
            format!("«{math}»")
        }
    }

    fn marked(marked: &str) -> Outcome {
        Outcome {
            marked: marked.to_owned(),
            ..Outcome::default()
        }
    }

    fn committed(committed: &str) -> Outcome {
        Outcome {
            committed: committed.to_owned(),
            ..Outcome::default()
        }
    }

    fn passed(committed: &str) -> Outcome {
        Outcome {
            committed: committed.to_owned(),
            ..already_passed()
        }
    }

    /// What a well-behaved app shows after keys, each tested and then pressed only if eaten
    #[derive(Debug, Default, PartialEq, Eq)]
    struct Typed {
        document: String,
        marked: String,
    }

    fn typed(document: &str, marked: &str) -> Typed {
        Typed {
            document: document.to_owned(),
            marked: marked.to_owned(),
        }
    }

    /// Types one key per character, then says what `also_press` does to a key that isn't eaten
    fn type_text(session: &mut Session, text: &str, also_press: bool) -> Typed {
        let mut typed = Typed::default();
        for (stamp, (start, character)) in (1..).zip(text.char_indices()) {
            let character = &text[start..start + character.len_utf8()];
            let key = Key::Text(character);
            let outcomes = match session.test(key, stamp, &mark) {
                None => vec![session.press(key, stamp, &mark)],
                Some(outcome) if also_press => vec![outcome, session.press(key, stamp, &mark)],
                Some(outcome) => vec![outcome],
            };
            for (index, outcome) in outcomes.into_iter().enumerate() {
                typed.document.push_str(&outcome.committed);
                if index == 0 {
                    typed.marked = outcome.marked;
                    if outcome.pass_through {
                        typed.document.push_str(character);
                    }
                } else {
                    assert_eq!(outcome, already_passed());
                }
            }
            session.release();
        }
        typed
    }

    #[test]
    fn keys_that_pass_through_are_not_eaten() {
        let mut session = Session::default();
        for (stamp, key) in (1..).zip([
            Key::Text("a"),
            Key::Text("\\"),
            Key::Backspace,
            Key::Escape,
            Key::Enter,
            Key::Other,
        ]) {
            assert_eq!(session.test(key, stamp, &mark), Some(passed("")));
        }
        assert!(!session.is_holding());
    }

    #[test]
    fn keys_that_are_held_are_eaten_and_change_nothing_when_tested() {
        let mut session = Session::default();
        assert_eq!(session.test(Key::Text("$"), 1, &mark), None);
        assert!(!session.is_holding());
        assert_eq!(session.test(Key::Text("$"), 1, &mark), None);
        assert_eq!(session.press(Key::Text("$"), 1, &mark), marked("$"));
        assert!(session.is_holding());
        assert_eq!(session.test(Key::Text("$"), 2, &mark), None);
        assert_eq!(session.press(Key::Text("$"), 2, &mark), marked("$$‹›"));
        assert_eq!(session.test(Key::Text("x"), 3, &mark), None);
        assert_eq!(session.press(Key::Text("x"), 3, &mark), marked("$$‹x›"));
        assert_eq!(session.test(Key::Backspace, 4, &mark), None);
        assert_eq!(session.press(Key::Backspace, 4, &mark), marked("$$‹›"));
    }

    #[test]
    fn tested_key_that_passes_is_taken_once() {
        let mut session = Session::default();
        assert_eq!(session.test(Key::Text("\\"), 1, &mark), Some(passed("")));
        assert_eq!(session.test(Key::Text("\\"), 1, &mark), Some(passed("")));
        assert_eq!(session.press(Key::Text("\\"), 1, &mark), passed(""));
        // one backslash was typed, so the delimiter after it is plain text
        assert_eq!(session.test(Key::Text("$"), 2, &mark), Some(passed("")));
        assert!(!session.is_holding());
    }

    #[test]
    fn pressed_key_that_passes_is_taken_once() {
        let mut session = Session::default();
        assert_eq!(session.press(Key::Text("\\"), 1, &mark), passed(""));
        assert_eq!(session.press(Key::Text("\\"), 1, &mark), passed(""));
        assert_eq!(session.test(Key::Text("\\"), 1, &mark), Some(passed("")));
        assert_eq!(session.test(Key::Text("$"), 2, &mark), Some(passed("")));
    }

    #[test]
    fn same_key_in_another_event_is_taken_again() {
        let mut session = Session::default();
        assert_eq!(session.test(Key::Text("\\"), 1, &mark), Some(passed("")));
        // a key that repeats while held down
        assert_eq!(session.test(Key::Text("\\"), 2, &mark), Some(passed("")));
        assert_eq!(session.test(Key::Text("$"), 3, &mark), None);

        // two events that share a stamp, with the key coming up in between
        let mut session = Session::default();
        assert_eq!(session.test(Key::Text("\\"), 1, &mark), Some(passed("")));
        session.release();
        assert_eq!(session.test(Key::Text("\\"), 1, &mark), Some(passed("")));
        assert_eq!(session.test(Key::Text("$"), 1, &mark), None);
    }

    #[test]
    fn another_key_under_the_same_stamp_is_taken() {
        let mut session = Session::default();
        assert_eq!(session.test(Key::Text("\\"), 1, &mark), Some(passed("")));
        assert_eq!(session.test(Key::Text("a"), 1, &mark), Some(passed("")));
        assert_eq!(session.test(Key::Text("$"), 1, &mark), None);
    }

    #[test]
    fn repeated_backspace_is_counted_each_time() {
        let mut session = Session::default();
        type_text(&mut session, "\\\\", false);
        assert_eq!(session.test(Key::Backspace, 10, &mark), Some(passed("")));
        assert_eq!(session.press(Key::Backspace, 10, &mark), passed(""));
        assert_eq!(session.test(Key::Backspace, 11, &mark), Some(passed("")));
        assert_eq!(session.test(Key::Text("$"), 12, &mark), None);
    }

    #[test]
    fn return_while_holding() {
        let mut session = Session::default();
        type_text(&mut session, "$$x^2", false);
        assert_eq!(session.test(Key::Enter, 10, &mark), None);
        assert!(session.is_holding());
        assert_eq!(session.press(Key::Enter, 10, &mark), committed("«x^2»"));
        assert!(!session.is_holding());

        // with no math there is nothing to convert, so the app gets the key
        type_text(&mut session, "$$", false);
        assert_eq!(session.test(Key::Enter, 20, &mark), Some(passed("$$")));
        assert!(!session.is_holding());
        assert_eq!(session.press(Key::Enter, 20, &mark), passed(""));
    }

    #[test]
    fn escape_while_holding() {
        let mut session = Session::default();
        type_text(&mut session, "$$x^2", false);
        assert_eq!(session.test(Key::Escape, 10, &mark), None);
        assert!(session.is_holding());
        assert_eq!(session.press(Key::Escape, 10, &mark), committed("$$x^2"));
        assert!(!session.is_holding());
        assert_eq!(session.test(Key::Escape, 11, &mark), Some(passed("")));
    }

    #[test]
    fn other_key_while_holding_hands_over_when_tested() {
        let mut session = Session::default();
        type_text(&mut session, "$$x^2", false);
        assert_eq!(session.test(Key::Other, 10, &mark), Some(passed("$$x^2")));
        assert!(!session.is_holding());
        assert_eq!(session.test(Key::Other, 10, &mark), Some(passed("")));
        assert_eq!(session.press(Key::Other, 10, &mark), passed(""));

        // an app that sends the key without asking first
        type_text(&mut session, "$$y", false);
        assert_eq!(session.press(Key::Other, 20, &mark), passed("$$y"));
        assert_eq!(session.press(Key::Other, 20, &mark), passed(""));
        assert!(!session.is_holding());
    }

    #[test]
    fn typing_is_the_same_however_the_app_calls() {
        let text = "a \\$$ and \\\\$$x^2$$, $5 then $$y$$.";
        let expected = typed("a \\$$ and \\\\«x^2», $5 then «y».", "");
        for also_press in [false, true] {
            let mut session = Session::default();
            assert_eq!(type_text(&mut session, text, also_press), expected);
        }

        // an app that never asks
        let mut session = Session::default();
        let mut document = String::new();
        for (stamp, character) in (1..).zip(text.chars()) {
            let character = character.to_string();
            let outcome = session.press(Key::Text(&character), stamp, &mark);
            document.push_str(&outcome.committed);
            if outcome.pass_through {
                document.push_str(&character);
            }
        }
        assert_eq!(document, expected.document);
    }

    #[test]
    fn ending_input_hands_over_what_was_typed() {
        let mut session = Session::default();
        type_text(&mut session, "$$x^2$", false);
        assert_eq!(session.end_input(), "$$x^2$");
        assert!(!session.is_holding());
        assert_eq!(session.end_input(), "");
    }

    #[test]
    fn delimiter_only_changes_while_nothing_is_held() {
        let mut session = Session::default();
        session.press(Key::Text("$"), 1, &mark);
        session.set_delimiter(Delimiter::Backtick);
        assert_eq!(session.press(Key::Text("$"), 2, &mark), marked("$$‹›"));
        session.end_input();
        session.set_delimiter(Delimiter::Backtick);
        assert_eq!(session.press(Key::Text("`"), 3, &mark), marked("`‹›"));
    }

    #[test]
    fn keys_that_could_open() {
        for text in ["$", "\\", "`", "a$"] {
            assert!(Session::could_open(Key::Text(text)), "{text}");
        }
        for key in [
            Key::Text("a"),
            Key::Text("("),
            Key::Text(""),
            Key::Backspace,
            Key::Enter,
            Key::Escape,
            Key::Other,
        ] {
            assert!(!Session::could_open(key), "{key:?}");
        }
    }
}
