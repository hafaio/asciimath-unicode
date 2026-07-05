Ascii Math Unicode
==================

[![build](https://github.com/hafaio/asciimath-unicode/actions/workflows/build.yml/badge.svg)](https://github.com/hafaio/asciimath-unicode/actions/workflows/build.yml)
[![chrome](https://img.shields.io/badge/chrome-extension-orange)](https://chrome.google.com/webstore/detail/llehdcbaonklonjlfgeggamnebgggoab?authuser=0&hl=en)
[![license](https://img.shields.io/github/license/hafaio/asciimath-unicode)](LICENSE)

A chrome extension for rendering [ascii math](http://asciimath.org/) as unicode.

When installed, you can select text and then by clicking the extension, opening the context menu, or activating a hotkey, convert the text into unicode.

For example, highlighting the following text (the example from ascii math):

```
sum_(i=1)^n i^3=((n(n+1))/2)^2
```

You'll convert it to:
```
∑ᵢ₌₁ⁿi³=(ⁿ⁽ⁿ⁺¹⁾⁄₂)²
```

While not a perfect representation, this is more portable than an image, and can often be easier to read.

Notes
-----

In the process of creating this, I wrote an ascii math parser from scratch.
Parser combinators had some issues differentiating symbols appropriately, and traditional CFGs had trouble with the greedy approach to ascii math (e.g. it'll interpret `sin )` as just the token `sin` with no argument, instead of failing to parse because it doesn't have an argument.
Most javascript CFGs also require specifying the grammar in a text file, which is somewhat obnoxious given the large symbol tables associated with ascii math.

Development
-----------

Compile a local version for development testing
```
bun export
```

Compile a zip for upload to the store
```
bun run pack
```

To Do
-----

- [ ] It'd be nice to extend the rendering to multi-line support that works for fixed width fonts.
