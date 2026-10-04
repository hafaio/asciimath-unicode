import { mount } from "svelte";
import OptionsPage from "./options-page.svelte";

const root = document.getElementById("root");
if (root === null) {
    throw new Error("missing #root");
}
mount(OptionsPage, { target: root });
