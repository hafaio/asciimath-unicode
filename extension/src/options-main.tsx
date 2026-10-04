import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { OptionsPage } from "./options-page";

const root = document.getElementById("root");
if (root === null) {
	throw new Error("missing #root");
}
createRoot(root).render(
	<StrictMode>
		<OptionsPage />
	</StrictMode>,
);
