/** the match pattern for a page's site, or undefined if it can't be enabled */
export function sitePattern(url: string | undefined): string | undefined {
    if (url === undefined || !URL.canParse(url)) {
        return undefined;
    }
    const { protocol, hostname } = new URL(url);
    if ((protocol === "http:" || protocol === "https:") && hostname !== "") {
        return `${protocol}//${hostname}/*`;
    } else {
        return undefined;
    }
}

const hostPattern = /^(?:https?|\*):\/\/(?<host>[^/]+)\/\*$/u;

/** a match pattern as a person would name the site */
export function siteName(pattern: string): string {
    return hostPattern.exec(pattern)?.groups?.["host"] ?? pattern;
}
