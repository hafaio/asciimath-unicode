/** every string a visitor reads, and every link they can follow */
export const copy = {
    pageTitle: "Ascii Math Unicode",
    pageDescription:
        "Type ascii math and get unicode, in Chrome or anywhere on your Mac or Windows PC.",
    headline: "Type math, get unicode",
    subhead:
        "Write ascii math between markers like $$x^2$$ and it turns into unicode as you type: x².",
    extension: {
        name: "Chrome extension",
        description:
            "Converts math as you type in text boxes on any page you turn it on for.",
        links: [
            {
                label: "Add to Chrome",
                url: "https://chrome.google.com/webstore/detail/llehdcbaonklonjlfgeggamnebgggoab",
            },
        ],
    },
    keyboard: {
        name: "Keyboard",
        description:
            "Converts math as you type in any app on Mac or Windows. Ordinary typing passes straight through.",
        // the repo's latest release is always the keyboards'
        links: [
            {
                label: "Download for Mac",
                url: "https://github.com/hafacc/asciimath-unicode/releases/latest/download/AsciiMathUnicode.pkg",
            },
            {
                label: "Download for Windows",
                url: "https://github.com/hafacc/asciimath-unicode/releases/latest/download/AsciiMathUnicode.msi",
            },
        ],
    },
};
