import { startConverting } from "./typing";

const stopKey = "asciimathUnicodeStopAutosub";

// Injected both by registration and on enabling, so it can run twice, and
// a copy left from before an extension update can no longer reach the
// worker, so replace whatever is running.
const previous = (globalThis as { [stopKey]?: () => void })[stopKey];
try {
	previous?.();
} catch (err) {
	console.debug("couldn't stop the previous copy", err);
}
Object.assign(globalThis, { [stopKey]: startConverting(true) });
