import {
	type ReactElement,
	type ReactNode,
	useEffect,
	useId,
	useState,
} from "react";
import { copy } from "./copy";
import { type DelimiterName, delimiterNames, delimiters } from "./delimiters";
import { currentShortcut, openShortcutSettings, shortcutKeys } from "./hotkey";
import { convert } from "./message";
import {
	defaultOptions,
	type Options,
	optionsSchema,
	parseOptions,
	type SkinTone,
} from "./options";
import { startConverting } from "./typing";
import { Button } from "./ui/button";
import { Kbd, KbdGroup } from "./ui/kbd";
import { Switch } from "./ui/switch";
import { Textarea } from "./ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";

type OutputOption = "pruneParens" | "vulgarFractions" | "scriptFractions";

// each output switch, with math whose conversion shows what it changes
const outputSwitches: [OutputOption, string][] = [
	["pruneParens", "x^(2n)"],
	["vulgarFractions", "1/2"],
	["scriptFractions", "(x+1)/(x-1)"],
];

const skinToneEmoji: Record<SkinTone, string> = {
	Default: "👍",
	Light: "👍🏻",
	MediumLight: "👍🏼",
	Medium: "👍🏽",
	MediumDark: "👍🏾",
	Dark: "👍🏿",
};

// undefined when previewing the page outside the extension
const sync: chrome.storage.SyncStorageArea | undefined =
	globalThis.chrome?.storage?.sync;

async function loadOptions(): Promise<{ options: Options; repaired: boolean }> {
	if (sync === undefined) {
		return { options: defaultOptions, repaired: false };
	}
	const stored = await sync.get(
		defaultOptions as unknown as Record<string, unknown>,
	);
	const { options, invalid } = parseOptions(stored);
	if (invalid.length > 0) {
		await sync.set(
			Object.fromEntries(invalid.map((key) => [key, defaultOptions[key]])),
		);
	}
	return { options, repaired: invalid.length > 0 };
}

/** the shortcut as keys, null when none is set, undefined until known */
function useShortcut(): string[] | null | undefined {
	const [keys, setKeys] = useState<string[] | null | undefined>();
	useEffect(() => {
		if (!globalThis.chrome?.commands) {
			return;
		}
		function refresh(): void {
			void currentShortcut().then((shortcut) => {
				setKeys(shortcut === undefined ? null : shortcutKeys(shortcut));
			});
		}
		// the shortcut is changed in another tab, so recheck on return
		function onVisible(): void {
			if (document.visibilityState === "visible") {
				refresh();
			}
		}
		refresh();
		document.addEventListener("visibilitychange", onVisible);
		return () => {
			document.removeEventListener("visibilitychange", onVisible);
		};
	}, []);
	return keys;
}

/**
 * Each output switch's example converted with the stored options, redone
 * whenever `saves` changes; 0 means nothing has loaded yet.
 */
function useExamples(saves: number): Record<string, string> {
	const [examples, setExamples] = useState<Record<string, string>>({});
	useEffect(() => {
		if (saves === 0 || !globalThis.chrome?.runtime?.id) {
			return;
		}
		let current = true;
		void Promise.all(
			outputSwitches.map(async ([, math]) => [math, await convert(math)]),
		).then(
			(pairs) => {
				if (current) {
					setExamples(Object.fromEntries(pairs));
				}
			},
			(err: unknown) => {
				console.error("couldn't convert examples", err);
			},
		);
		return () => {
			current = false;
		};
	}, [saves]);
	return examples;
}

function Section({
	title,
	children,
}: {
	title: string;
	children: ReactNode;
}): ReactElement {
	return (
		<section className="flex flex-col gap-2.5">
			<h2 className="ml-1 font-medium text-[13px] text-muted-foreground uppercase tracking-[0.08em]">
				{title}
			</h2>
			<div className="divide-y rounded-2xl border bg-card">{children}</div>
		</section>
	);
}

function SwitchRow({
	label,
	detail,
	mono,
	checked,
	onChange,
}: {
	label: string;
	detail?: string;
	mono?: boolean;
	checked: boolean;
	onChange: (checked: boolean) => void;
}): ReactElement {
	const id = useId();
	return (
		<div className="flex items-center gap-4 px-6 py-4.5">
			<label htmlFor={id} className="flex grow cursor-pointer flex-col gap-1">
				<span className="font-medium text-[15px]">{label}</span>
				{detail === undefined ? null : (
					<span
						className={
							mono
								? "font-mono text-[13px] text-muted-foreground"
								: "text-[13px] text-muted-foreground"
						}
					>
						{detail}
					</span>
				)}
			</label>
			<Switch id={id} checked={checked} onCheckedChange={onChange} />
		</div>
	);
}

function Usage({ delimiter }: { delimiter: DelimiterName }): ReactElement {
	const { open, close } = delimiters[delimiter];
	useEffect(() => {
		return globalThis.chrome?.runtime?.id ? startConverting(false) : undefined;
	}, []);
	return (
		<section className="flex flex-col gap-3.5">
			<h2 className="font-semibold text-[28px] tracking-tight">
				{copy.usageHeading}
			</h2>
			<p className="text-[15px] text-muted-foreground leading-relaxed">
				{copy.usage}
			</p>
			<Textarea
				aria-label={copy.tryLabel}
				className="h-32.5 text-[22px] leading-[1.45]"
				placeholder={copy.tryPlaceholder(`${open}x^2${close}`)}
			/>
		</section>
	);
}

export function OptionsPage(): ReactElement {
	const [options, setOptions] = useState<Options>();
	const [repaired, setRepaired] = useState(false);
	const shortcut = useShortcut();
	const [saves, setSaves] = useState(0);
	const examples = useExamples(saves);

	useEffect(() => {
		loadOptions().then(
			(loaded) => {
				setOptions(loaded.options);
				setRepaired(loaded.repaired);
				setSaves((count) => count + 1);
			},
			(err: unknown) => {
				console.error("couldn't load options", err);
				setOptions(defaultOptions);
				setRepaired(true);
			},
		);
	}, []);

	useEffect(() => {
		if (!repaired) {
			return;
		}
		const timer = setTimeout(() => {
			setRepaired(false);
		}, 6000);
		return () => {
			clearTimeout(timer);
		};
	}, [repaired]);

	function update(changes: Partial<Options>): void {
		setOptions((previous) => previous && { ...previous, ...changes });
		sync?.set(changes).then(
			() => {
				setSaves((count) => count + 1);
			},
			(err: unknown) => {
				console.error("couldn't save options", err);
			},
		);
	}

	return (
		<main className="mx-auto flex max-w-280 flex-col gap-8 px-4 py-14 sm:px-8">
			<header className="flex flex-col gap-1.5">
				<h1 className="font-semibold text-4xl tracking-tight">
					{copy.optionsTitle}
				</h1>
				<span className="text-[15px] text-muted-foreground">
					{copy.optionsSubtitle}
				</span>
			</header>
			{repaired ? (
				<p
					role="alert"
					className="rounded-xl border border-primary px-4 py-3 text-sm"
				>
					{copy.optionsReadError}
				</p>
			) : null}
			<Usage delimiter={options?.delimiter ?? defaultOptions.delimiter} />
			{options === undefined ? null : (
				<div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2">
					<div className="flex flex-col gap-5">
						<Section title={copy.sectionTurningOn}>
							<div className="flex flex-wrap items-center gap-4 px-6 py-4.5">
								<span className="grow font-medium text-[15px]">
									{copy.hotkeyHeading}
								</span>
								{shortcut === null ? (
									<span className="basis-full text-[13px] text-muted-foreground">
										{copy.hotkeyMissing}
									</span>
								) : (
									<KbdGroup>
										{shortcut?.map((key) => (
											<Kbd key={key}>{key}</Kbd>
										))}
									</KbdGroup>
								)}
								<Button
									variant="outline"
									disabled={!globalThis.chrome?.commands}
									onClick={() => {
										void openShortcutSettings();
									}}
								>
									{copy.hotkeyOpenSettings}
								</Button>
							</div>
							<SwitchRow
								label={copy.wholeSite}
								detail={copy.wholeSiteHint}
								checked={options.wholeSite}
								onChange={(wholeSite) => {
									update({ wholeSite });
								}}
							/>
						</Section>
						<Section title={copy.sectionTyping}>
							<div className="flex flex-col gap-3.5 px-6 py-4.5">
								<span className="font-medium text-[15px]">
									{copy.delimiter}
								</span>
								<ToggleGroup
									type="single"
									aria-label={copy.delimiter}
									value={options.delimiter}
									onValueChange={(value) => {
										const parsed =
											optionsSchema.shape.delimiter.safeParse(value);
										if (parsed.success) {
											update({ delimiter: parsed.data });
										}
									}}
								>
									{delimiterNames.map((name) => (
										<ToggleGroupItem
											key={name}
											value={name}
											className="h-9 rounded-full px-3.5 font-mono text-sm"
										>
											{delimiters[name].display}
										</ToggleGroupItem>
									))}
								</ToggleGroup>
							</div>
						</Section>
					</div>
					<Section title={copy.sectionOutput}>
						{outputSwitches.map(([name, math]) => (
							<SwitchRow
								key={name}
								label={copy[name]}
								detail={
									examples[math] === undefined
										? math
										: `${math} → ${examples[math]}`
								}
								mono
								checked={options[name]}
								onChange={(checked) => {
									update({ [name]: checked });
								}}
							/>
						))}
						<div className="flex flex-col gap-3 px-6 py-4.5">
							<span className="font-medium text-[15px]">{copy.skinTone}</span>
							<ToggleGroup
								type="single"
								aria-label={copy.skinTone}
								value={options.skinTone}
								onValueChange={(value) => {
									const parsed = optionsSchema.shape.skinTone.safeParse(value);
									if (parsed.success) {
										update({ skinTone: parsed.data });
									}
								}}
							>
								{optionsSchema.shape.skinTone.options.map((tone) => (
									<ToggleGroupItem
										key={tone}
										value={tone}
										aria-label={copy.skinToneNames[tone]}
										className="size-11 rounded-xl text-[22px] data-[state=on]:border-2 data-[state=on]:bg-primary/15 data-[state=on]:text-foreground"
									>
										{skinToneEmoji[tone]}
									</ToggleGroupItem>
								))}
							</ToggleGroup>
						</div>
					</Section>
				</div>
			)}
		</main>
	);
}
