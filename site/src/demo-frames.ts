/** one moment of a typing demo */
export interface Frame {
    /** text already in the page */
    plain: string;
    /** text the keyboard still holds, shown underlined after `plain` */
    held: string;
}

const typed = "sum_(i=1)^n i^3=((n(n+1))/2)^2";
const converted = "∑ᵢ₌₁ⁿ i³=(ⁿ⁽ⁿ⁺¹⁾⁄₂)²";
// what the converter gives for each prefix of `typed`, with missing parts shown
const partial = [
    "s",
    "su",
    "∑",
    "∑▫",
    "∑",
    "∑ᵢ",
    "∑ᵢ₌",
    "∑ᵢ₌₁",
    "∑ᵢ₌₁",
    "∑ᵢ₌₁⸋",
    "∑ᵢ₌₁ⁿ",
    "∑ᵢ₌₁ⁿ",
    "∑ᵢ₌₁ⁿ i",
    "∑ᵢ₌₁ⁿ i⸋",
    "∑ᵢ₌₁ⁿ i³",
    "∑ᵢ₌₁ⁿ i³=",
    "∑ᵢ₌₁ⁿ i³=(",
    "∑ᵢ₌₁ⁿ i³=((",
    "∑ᵢ₌₁ⁿ i³=((n",
    "∑ᵢ₌₁ⁿ i³=((n(",
    "∑ᵢ₌₁ⁿ i³=((n(n",
    "∑ᵢ₌₁ⁿ i³=((n(n+",
    "∑ᵢ₌₁ⁿ i³=((n(n+1",
    "∑ᵢ₌₁ⁿ i³=((n(n+1)",
    "∑ᵢ₌₁ⁿ i³=((n(n+1))",
    "∑ᵢ₌₁ⁿ i³=((n(n+1))/□",
    "∑ᵢ₌₁ⁿ i³=(ⁿ⁽ⁿ⁺¹⁾⁄₂",
    "∑ᵢ₌₁ⁿ i³=(ⁿ⁽ⁿ⁺¹⁾⁄₂)",
    "∑ᵢ₌₁ⁿ i³=(ⁿ⁽ⁿ⁺¹⁾⁄₂)⸋",
    converted,
];

const raw = `$$${typed}$$`;
const done: Frame = { plain: converted, held: "" };

/** frames of the extension demo, where typed math stays as it is until the closing marker */
export const extensionFrames: Frame[] = [
    ...Array.from(raw, (_, end) => ({ plain: raw.slice(0, end), held: "" })),
    done,
];

/** frames of the keyboard demo, where the math shows converted on every key */
export const keyboardFrames: Frame[] = [
    { plain: "", held: "" },
    { plain: "", held: "$" },
    { plain: "", held: "$$" },
    ...partial.map((math) => ({ plain: "", held: `$$${math}` })),
    { plain: "", held: `$$${converted}$` },
    done,
];
