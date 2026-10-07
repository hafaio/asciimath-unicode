//! The pairs of math markers the keyboards offer

/// A pair of math markers, from the same table as the extension's `delimiters.ts`
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Delimiter {
    /// `$$x$$`
    #[default]
    DoubleDollar,
    /// `\(x\)`
    Paren,
    /// `\[x\]`
    Bracket,
    /// `` `x` ``
    Backtick,
}

impl Delimiter {
    /// Every delimiter, in the order they are offered
    pub const ALL: [Delimiter; 4] = [
        Delimiter::DoubleDollar,
        Delimiter::Paren,
        Delimiter::Bracket,
        Delimiter::Backtick,
    ];

    /// The text that starts math
    #[must_use]
    pub fn open(self) -> &'static str {
        match self {
            Delimiter::DoubleDollar => "$$",
            Delimiter::Paren => "\\(",
            Delimiter::Bracket => "\\[",
            Delimiter::Backtick => "`",
        }
    }

    /// The text that ends math
    #[must_use]
    pub fn close(self) -> &'static str {
        match self {
            Delimiter::DoubleDollar => "$$",
            Delimiter::Paren => "\\)",
            Delimiter::Bracket => "\\]",
            Delimiter::Backtick => "`",
        }
    }

    /// The name the setting is stored under, as in the extension
    #[must_use]
    pub fn name(self) -> &'static str {
        match self {
            Delimiter::DoubleDollar => "doubleDollar",
            Delimiter::Paren => "paren",
            Delimiter::Bracket => "bracket",
            Delimiter::Backtick => "backtick",
        }
    }

    /// The delimiter stored under `name`, if there is one
    #[must_use]
    pub fn from_name(name: &str) -> Option<Self> {
        Delimiter::ALL
            .into_iter()
            .find(|delimiter| delimiter.name() == name)
    }

    /// The delimiter by its number in `asciimath_core.h`, where an unknown number is the default
    #[must_use]
    pub fn from_number(number: u8) -> Self {
        Delimiter::ALL
            .get(usize::from(number))
            .copied()
            .unwrap_or_default()
    }
}

#[cfg(test)]
mod tests {
    use super::Delimiter;

    #[test]
    fn names_round_trip() {
        for delimiter in Delimiter::ALL {
            assert_eq!(Delimiter::from_name(delimiter.name()), Some(delimiter));
        }
        assert_eq!(Delimiter::from_name("dollar"), None);
    }

    #[test]
    fn numbers_follow_the_order_offered() {
        assert_eq!(Delimiter::from_number(0), Delimiter::DoubleDollar);
        assert_eq!(Delimiter::from_number(3), Delimiter::Backtick);
        assert_eq!(Delimiter::from_number(200), Delimiter::DoubleDollar);
    }
}
