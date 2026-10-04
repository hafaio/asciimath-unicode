import { expect, test } from "bun:test";
import { siteName, sitePattern } from "./site-patterns.ts";

test("web pages map to their host", () => {
    expect(sitePattern("https://mail.google.com/mail/u/0/#inbox")).toBe(
        "https://mail.google.com/*",
    );
    expect(sitePattern("http://localhost:3000/x")).toBe("http://localhost/*");
});

test("other pages can't be enabled", () => {
    expect(sitePattern("chrome://extensions/")).toBeUndefined();
    expect(sitePattern("file:///tmp/a.html")).toBeUndefined();
    expect(sitePattern("not a url")).toBeUndefined();
    expect(sitePattern(undefined)).toBeUndefined();
});

test("site names", () => {
    expect(siteName("https://mail.google.com/*")).toBe("mail.google.com");
    expect(siteName("*://example.com/*")).toBe("example.com");
    expect(siteName("<all_urls>")).toBe("<all_urls>");
});
