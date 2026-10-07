//! The keyboard must convert as the extension does when that keeps typed spaces and adds none

use convert::Tone;

const INPUTS: &str = include_str!("inputs.txt");

fn tones() -> [(u8, Tone); 6] {
    [
        (0, Tone::Default),
        (1, Tone::Light),
        (2, Tone::MediumLight),
        (3, Tone::Medium),
        (4, Tone::MediumDark),
        (5, Tone::Dark),
    ]
}

#[test]
fn matches_the_extension_binding() {
    let inputs: Vec<&str> = INPUTS.lines().collect();
    assert!(inputs.len() > 20);
    for &inp in &inputs {
        for strip_brackets in [false, true] {
            for vulgar_fracs in [false, true] {
                for script_fracs in [false, true] {
                    for (number, tone) in tones() {
                        assert_eq!(
                            keyboard_core::convert(
                                inp,
                                strip_brackets,
                                vulgar_fracs,
                                script_fracs,
                                number,
                                false,
                            ),
                            convert::convert(
                                inp,
                                strip_brackets,
                                vulgar_fracs,
                                script_fracs,
                                tone,
                                true,
                                false,
                            ),
                            "{inp:?} strip_brackets={strip_brackets} vulgar_fracs={vulgar_fracs} \
                             script_fracs={script_fracs} tone={number}",
                        );
                    }
                }
            }
        }
    }
}
