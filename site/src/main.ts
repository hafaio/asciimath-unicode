import "asciimath-unicode/src/theme.css";
import { mount } from "svelte";
import App from "./app.svelte";

const root = document.getElementById("root");
if (root === null) {
    throw new Error("missing #root");
}
mount(App, { target: root });
