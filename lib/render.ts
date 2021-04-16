import {
  Value,
  Unary,
  Binary,
  Paren,
  Simple,
  Superscript,
  Subscript,
  Subsuperscript,
  Intermediate,
  Fraction,
  ExpressionElement,
  Expression,
} from "./parse";
import { nn } from "./utils";
import { Options, defaultOptions } from "./options";

type Render = Generator<string, void, undefined>;

export default function render(
  expression: Expression,
  {
    preserveWhitespace = defaultOptions.preserveWhitespace,
    pruneParens = defaultOptions.pruneParens,
    vulgarFractions = defaultOptions.vulgarFractions,
    fractionSlash = defaultOptions.fractionSlash,
    convertFractions = defaultOptions.convertFractions,
  }: Partial<Options> = {}
): string {
  /** if poss is Value or Value nested in Paren get value str else null */
  function tryValue(poss: ExpressionElement): string | null {
    while (poss instanceof Paren) {
      const vals = poss.arg.values;
      if (vals.length !== 1) {
        return null;
      } else {
        [poss] = vals;
      }
    }
    return poss instanceof Value ? poss.value : null;
  }

  /** remove parens from render */
  function removeParens(inter: Intermediate): Render {
    if (pruneParens && inter instanceof Paren) {
      return renderExpression(inter.arg);
    } else {
      return renderIntermediate(inter);
    }
  }

  // XXX trySub and trySuper usually have to recompute the results if they
  // fail. That could get expensive if the fail early in the parse tree, in
  // worse case scaling quadratically with the depth of such operators. This
  // probably isn't a big deal, and could be worked around by memoizing or
  // assuming that renderParen always does just the parentheses, in which case
  // we could just render those and add to what's been done before.

  /** try to superscript the expression or null if not possible */
  function trySuper(inter: Intermediate): string[] | null {
    const pruned = [...removeParens(inter)].join("");
    const suped = [...pruned].map(
      (c) => superscripts.get(c) || /^\s+$/.exec(c)?.[0]
    );
    return suped.every((c): c is string => !!c) ? suped : null;
  }

  /** try to subscript the expression or null if not possible */
  function trySub(inter: Intermediate): string[] | null {
    const pruned = [...removeParens(inter)].join("");
    const subed = [...pruned].map(
      (c) => subscripts.get(c) || /^\s+$/.exec(c)?.[0]
    );
    return subed.every((c): c is string => !!c) ? subed : null;
  }

  function* renderValue(val: Value): Render {
    yield val.value;
    if (preserveWhitespace) yield val.whitespace;
  }

  function* renderParen(paren: Paren): Render {
    for (const str of renderValue(paren.left)) yield str;
    for (const str of renderExpression(paren.arg)) yield str;
    for (const str of renderValue(paren.right)) yield str;
  }

  function* renderUnary(unary: Unary): Render {
    const font = formats.get(unary.name.value);
    const modifier = modifiers.get(unary.name.value);
    const func = functions.get(unary.name.value);
    if (font) {
      for (const str of renderSimple(unary.arg)) {
        for (const c of str) yield font.get(c) || c;
      }
    } else if (unary.name.value === "sqrt") {
      yield nn(roots.get("2"));
      const over = nn(modifiers.get("overline"));
      for (const c of combinerChars([...removeParens(unary.arg)].join(""))) {
        yield c;
        yield over;
      }
    } else if (unary.name.value === "text" || unary.name.value === "mbox") {
      // ignore text / mbox name
      for (const str of renderSimple(unary.arg)) yield str;
    } else if (modifier) {
      // modifier values
      if (unary.name.value === "ul" || unary.name.value === "overline") {
        // apply to all characters
        for (const c of combinerChars([...renderSimple(unary.arg)].join(""))) {
          yield c;
          yield modifier;
        }
      } else {
        // apply only to center character
        const chars = [...combinerChars([...renderSimple(unary.arg)].join(""))];
        const middle = Math.floor((chars.length - 1) / 2);
        for (const [i, c] of chars.entries()) {
          yield c;
          if (i === middle) {
            yield modifier;
          }
        }
      }
    } else if (func) {
      // special functions
      const [left, right] = func;
      yield left;
      for (const str of removeParens(unary.arg)) yield str;
      yield right;
    } else {
      // TODO for normal functions, there are cases where we many need to
      // change rendering of name, or add whitespace
      for (const str of renderValue(unary.name)) yield str;
      for (const str of renderSimple(unary.arg)) yield str;
    }
  }

  function* renderBinary(binary: Binary): Render {
    const firstVal = tryValue(binary.first);
    const root = firstVal && roots.get(firstVal);
    if (binary.name.value === "root" && root) {
      // roots
      yield root;
      const over = nn(modifiers.get("overline"));
      for (const c of combinerChars(
        [...removeParens(binary.second)].join("")
      )) {
        yield c;
        yield over;
      }
    } else if (binary.name.value === "frac" && convertFractions) {
      // fraction conversion
      for (const str of renderFraction(
        new Fraction(binary.first, binary.name.whitespace, binary.second)
      )) {
        yield str;
      }
    } else {
      // normal functions
      for (const str of renderValue(binary.name)) yield str;
      for (const str of renderSimple(binary.first)) yield str;
      for (const str of renderSimple(binary.second)) yield str;
    }
  }

  function renderSimple(simp: Simple): Render {
    if (simp instanceof Value) {
      return renderValue(simp);
    } else if (simp instanceof Unary) {
      return renderUnary(simp);
    } else if (simp instanceof Binary) {
      return renderBinary(simp);
    } /* istanbul ignore next */ else if (simp instanceof Paren) {
      return renderParen(simp);
    } else {
      throw new Error("internal error: unreachable");
    }
  }

  function* renderSubscript(sub: Subscript): Render {
    for (const str of renderSimple(sub.norm)) yield str;

    const subed = trySub(sub.sub);

    if (subed) {
      // we can render down
      if (preserveWhitespace) yield sub.white;
      for (const c of subed) yield c;
    } else {
      // need to recompute
      yield "_";
      if (preserveWhitespace) yield sub.white;
      for (const str of renderSimple(sub.sub)) yield str;
    }
  }

  function* renderSuperscript(sup: Superscript): Render {
    for (const str of renderSimple(sup.norm)) yield str;

    const suped = trySuper(sup.sup);

    if (suped) {
      // we can render up
      if (preserveWhitespace) yield sup.white;
      for (const c of suped) yield c;
    } else {
      // need to recompute
      yield "^";
      if (preserveWhitespace) yield sup.white;
      for (const str of renderSimple(sup.sup)) yield str;
    }
  }

  function* renderSubsuperscript(subsuper: Subsuperscript): Render {
    for (const str of renderSimple(subsuper.norm)) yield str;

    const subed = trySub(subsuper.sub);
    const suped = trySuper(subsuper.sup);

    if (suped && subed) {
      // we can do subsuper
      if (preserveWhitespace) yield subsuper.subwhite;
      for (const c of subed) yield c;
      if (preserveWhitespace) yield subsuper.supwhite;
      for (const c of suped) yield c;
    } else {
      // need to recompute
      yield "_";
      if (preserveWhitespace) yield subsuper.subwhite;
      for (const str of renderSimple(subsuper.sub)) yield str;
      yield "^";
      if (preserveWhitespace) yield subsuper.supwhite;
      for (const str of renderSimple(subsuper.sup)) yield str;
    }
  }

  function renderIntermediate(inter: Intermediate): Render {
    if (inter instanceof Subscript) {
      return renderSubscript(inter);
    } else if (inter instanceof Superscript) {
      return renderSuperscript(inter);
    } else if (inter instanceof Subsuperscript) {
      return renderSubsuperscript(inter);
    } else {
      return renderSimple(inter);
    }
  }

  function* renderFraction(frac: Fraction): Render {
    const numer = tryValue(frac.numer);
    const denom = tryValue(frac.denom);
    let vulgar;
    if (
      vulgarFractions &&
      numer &&
      denom &&
      (vulgar = fractions.get(`${numer}/${denom}`))
    ) {
      yield vulgar;
      return;
    }

    const suped = trySuper(frac.numer);
    const subed = trySub(frac.denom);

    if (vulgarFractions && numer === "1" && subed) {
      // we can do 1/ sub fraction
      yield "⅟";
      if (preserveWhitespace) yield frac.dwhite;
      for (const c of subed) yield c;
    } else if (suped && subed) {
      // we can do super / sub fraction
      for (const c of suped) yield c;
      yield fractionSlash ? "⁄" : "/";
      if (preserveWhitespace) yield frac.dwhite;
      for (const c of subed) yield c;
    } else {
      // need to recompute
      for (const str of renderIntermediate(frac.numer)) yield str;
      yield "/";
      if (preserveWhitespace) yield frac.dwhite;
      for (const str of renderIntermediate(frac.denom)) yield str;
    }
  }

  function renderExpressionElement(elem: ExpressionElement): Render {
    if (elem instanceof Fraction) {
      return renderFraction(elem);
    } else {
      return renderIntermediate(elem);
    }
  }

  function* renderExpression(expr: Expression): Render {
    for (const elem of expr.values) {
      for (const str of renderExpressionElement(elem)) yield str;
    }
  }

  return [...renderExpression(expression)].join("");
}

const fractions = new Map<string, string>([
  ["0/3", "↉"],
  ["1/10", "⅒"],
  ["1/9", "⅑"],
  ["1/8", "⅛"],
  ["1/7", "⅐"],
  ["1/6", "⅙"],
  ["1/5", "⅕"],
  ["1/4", "¼"],
  ["1/3", "⅓"],
  ["1/2", "½"],
  ["2/5", "⅖"],
  ["2/3", "⅔"],
  ["3/8", "⅜"],
  ["3/5", "⅗"],
  ["3/4", "¾"],
  ["4/5", "⅘"],
  ["5/8", "⅝"],
  ["5/6", "⅚"],
  ["7/8", "⅞"],
]);

const superscripts = new Map<string, string>([
  ["a", "ᵃ"],
  ["b", "ᵇ"],
  ["c", "ᶜ"],
  ["d", "ᵈ"],
  ["e", "ᵉ"],
  ["f", "ᶠ"],
  ["g", "ᵍ"],
  ["h", "ʰ"],
  ["i", "ⁱ"],
  ["j", "ʲ"],
  ["k", "ᵏ"],
  ["l", "ˡ"],
  ["m", "ᵐ"],
  ["n", "ⁿ"],
  ["o", "ᵒ"],
  ["p", "ᵖ"],
  ["r", "ʳ"],
  ["s", "ˢ"],
  ["t", "ᵗ"],
  ["u", "ᵘ"],
  ["v", "ᵛ"],
  ["w", "ʷ"],
  ["x", "ˣ"],
  ["y", "ʸ"],
  ["z", "ᶻ"],
  ["A", "ᴬ"],
  ["B", "ᴮ"],
  ["D", "ᴰ"],
  ["E", "ᴱ"],
  ["G", "ᴳ"],
  ["H", "ᴴ"],
  ["I", "ᴵ"],
  ["J", "ᴶ"],
  ["K", "ᴷ"],
  ["L", "ᴸ"],
  ["M", "ᴹ"],
  ["N", "ᴺ"],
  ["O", "ᴼ"],
  ["P", "ᴾ"],
  ["R", "ᴿ"],
  ["T", "ᵀ"],
  ["U", "ᵁ"],
  ["V", "ⱽ"],
  ["W", "ᵂ"],
  ["0", "⁰"],
  ["1", "¹"],
  ["2", "²"],
  ["3", "³"],
  ["4", "⁴"],
  ["5", "⁵"],
  ["6", "⁶"],
  ["7", "⁷"],
  ["8", "⁸"],
  ["9", "⁹"],
  ["+", "⁺"],
  ["-", "⁻"],
  ["=", "⁼"],
  ["(", "⁽"],
  [")", "⁾"],
  ["α", "ᵅ"],
  ["β", "ᵝ"],
  ["γ", "ᵞ"],
  ["δ", "ᵟ"],
  ["ε", "ᵋ"],
  ["θ", "ᶿ"],
  ["ι", "ᶥ"],
  ["Φ", "ᶲ"],
  ["φ", "ᵠ"], // phi
  ["ϕ", "ᵠ"], // varphi
  ["χ", "ᵡ"],
]);

const subscripts = new Map<string, string>([
  ["a", "ₐ"],
  ["e", "ₑ"],
  ["h", "ₕ"],
  ["i", "ᵢ"],
  ["k", "ₖ"],
  ["l", "ₗ"],
  ["m", "ₘ"],
  ["n", "ₙ"],
  ["o", "ₒ"],
  ["p", "ₚ"],
  ["r", "ᵣ"],
  ["s", "ₛ"],
  ["t", "ₜ"],
  ["u", "ᵤ"],
  ["v", "ᵥ"],
  ["x", "ₓ"],
  ["0", "₀"],
  ["1", "₁"],
  ["2", "₂"],
  ["3", "₃"],
  ["4", "₄"],
  ["5", "₅"],
  ["6", "₆"],
  ["7", "₇"],
  ["8", "₈"],
  ["9", "₉"],
  ["+", "₊"],
  ["-", "₋"],
  ["=", "₌"],
  ["(", "₍"],
  [")", "₎"],
  ["β", "ᵦ"],
  ["γ", "ᵧ"],
  ["ρ", "ᵨ"],
  ["φ", "ᵩ"], // phi
  ["ϕ", "ᵩ"], // varphi
  ["χ", "ᵪ"],
]);

const functions = new Map<string, [string, string]>([
  ["abs", ["|", "|"]],
  ["floor", ["⌊", "⌋"]],
  ["ceil", ["⌈", "⌉"]],
  ["norm", ["||", "||"]],
]);

const roots = new Map<string, string>([
  ["2", "√"],
  ["3", "∛"],
  ["4", "∜"],
]);

const modifiers = new Map<string, string>([
  ["~", "\u0303"],
  ["hat", "\u0302"],
  ["bar", "\u0304"],
  ["overline", "\u0305"],
  ["vec", "\u20d7"], // TODO u20d1 for half arrow
  ["dot", "\u0307"],
  ["ddot", "\u0308"],
  ["ul", "\u0332"],
]);
const modified = new Set(modifiers.values());

/** produce an iterable of string combiner characters
 *
 * in general, this should probably be done be a library, but I'm going to hope
 * we only encounter combiner characters that we produce.
 */
function* combinerChars(input: string): Generator<string, void, undefined> {
  const buff = [];
  for (const c of input) {
    if (buff.length && !modified.has(c)) {
      yield buff.join("");
      buff.length = 0;
    }
    buff.push(c);
  }
  if (buff.length) yield buff.join("");
}

const reference =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
const formats = new Map<string, Map<string, string>>();
for (const [shortName, longName, mapped] of [
  [
    "bb",
    "mathbf",
    "𝐀𝐁𝐂𝐃𝐄𝐅𝐆𝐇𝐈𝐉𝐊𝐋𝐌𝐍𝐎𝐏𝐐𝐑𝐒𝐓𝐔𝐕𝐖𝐗𝐘𝐙𝐚𝐛𝐜𝐝𝐞𝐟𝐠𝐡𝐢𝐣𝐤𝐥𝐦𝐧𝐨𝐩𝐪𝐫𝐬𝐭𝐮𝐯𝐰𝐱𝐲𝐳𝟎𝟏𝟐𝟑𝟒𝟓𝟔𝟕𝟖𝟗",
  ],
  [
    "bbb",
    "mathbb",
    "𝔸𝔹ℂ𝔻𝔼𝔽𝔾ℍ𝕀𝕁𝕂𝕃𝕄ℕ𝕆ℙℚℝ𝕊𝕋𝕌𝕍𝕎𝕏𝕐ℤ𝕒𝕓𝕔𝕕𝕖𝕗𝕘𝕙𝕚ⅉ𝕜𝕝𝕞𝕟𝕠𝕡𝕢𝕣𝕤𝕥𝕦𝕧𝕨𝕩𝕪𝕫𝟘𝟙𝟚𝟛𝟜𝟝𝟞𝟟𝟠𝟡",
  ],
  ["cc", "mathcal", "𝒜ℬ𝒞𝒟ℰℱ𝒢ℋℐ𝒥𝒦ℒℳ𝒩𝒪𝒫𝒬ℛ𝒮𝒯𝒰𝒱𝒲𝒳𝒴𝒵𝒶𝒷𝒸ℯ𝒻ℊ𝒽𝒾𝒿𝓀𝓁𝓂𝓃ℴ𝓅𝓆𝓇𝓈𝓉𝓊𝓋𝓌𝓍𝓎𝓏"],
  [
    "tt",
    "mathtt",
    "𝙰𝙱𝙲𝙳𝙴𝙵𝙶𝙷𝙸𝙹𝙺𝙻𝙼𝙽𝙾𝙿𝚀𝚁𝚂𝚃𝚄𝚅𝚆𝚇𝚈𝚉𝚊𝚋𝚌𝚍𝚎𝚏𝚐𝚑𝚒𝚓𝚔𝚕𝚖𝚗𝚘𝚙𝚚𝚛𝚜𝚝𝚞𝚟𝚠𝚡𝚢𝚣𝟶𝟷𝟸𝟹𝟺𝟻𝟼𝟽𝟾𝟿",
  ],
  ["fr", "mathfrak", "𝔄𝔅ℭ𝔇𝔈𝔉𝔊ℌℑ𝔍𝔎𝔏𝔐𝔑𝔒𝔓𝔔ℜ𝔖𝔗𝔘𝔙𝔚𝔛𝔜ℨ𝔞𝔟𝔠𝔡𝔢𝔣𝔤𝔥𝔦𝔧𝔨𝔩𝔪𝔫𝔬𝔭𝔮𝔯𝔰𝔱𝔲𝔳𝔴𝔵𝔶𝔷"],
  [
    "sf",
    "mathsf",
    "𝖠𝖡𝖢𝖣𝖤𝖥𝖦𝖧𝖨𝖩𝖪𝖫𝖬𝖭𝖮𝖯𝖰𝖱𝖲𝖳𝖴𝖵𝖶𝖷𝖸𝖹𝖺𝖻𝖼𝖽𝖾𝖿𝗀𝗁𝗂𝗃𝗄𝗅𝗆𝗇𝗈𝗉𝗊𝗋𝗌𝗍𝗎𝗏𝗐𝗑𝗒𝗓𝟢𝟣𝟤𝟥𝟦𝟧𝟨𝟩𝟪𝟫",
  ],
]) {
  const charMap = new Map<string, string>(
    [...mapped].map((c, i) => [reference[i], c] as const)
  );
  formats.set(shortName, charMap);
  formats.set(longName, charMap);
}
