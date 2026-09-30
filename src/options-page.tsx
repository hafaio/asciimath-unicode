import {
	type ReactElement,
	type ReactNode,
	useEffect,
	useId,
	useState,
} from "react";
import { copy } from "./copy";
import {
	defaultOptions,
	type Options,
	optionsSchema,
	type SkinTone,
} from "./options";
import { Switch } from "./ui/switch";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";

type OutputOption = "pruneParens" | "vulgarFractions" | "scriptFractions";

const outputSwitches: OutputOption[] = [
	"pruneParens",
	"vulgarFractions",
	"scriptFractions",
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

async function loadOptions(): Promise<{ options: Options; valid: boolean }> {
	if (sync === undefined) {
		return { options: defaultOptions, valid: true };
	}
	const stored = await sync.get(
		defaultOptions as unknown as Record<string, unknown>,
	);
	const parsed = optionsSchema.safeParse(stored);
	return parsed.success
		? { options: parsed.data, valid: true }
		: { options: defaultOptions, valid: false };
}

function Section({ children }: { children: ReactNode }): ReactElement {
	return <div className="divide-y rounded-2xl border bg-card">{children}</div>;
}

function SwitchRow({
	label,
	checked,
	onChange,
}: {
	label: string;
	checked: boolean;
	onChange: (checked: boolean) => void;
}): ReactElement {
	const id = useId();
	return (
		<div className="flex items-center gap-4 px-6 py-4.5">
			<label
				htmlFor={id}
				className="grow cursor-pointer font-medium text-[15px]"
			>
				{label}
			</label>
			<Switch id={id} checked={checked} onCheckedChange={onChange} />
		</div>
	);
}

export function OptionsPage(): ReactElement {
	const [options, setOptions] = useState<Options>();
	const [readError, setReadError] = useState(false);

	useEffect(() => {
		loadOptions().then(
			({ options: loaded, valid }) => {
				setOptions(loaded);
				setReadError(!valid);
			},
			(err: unknown) => {
				console.error("couldn't load options", err);
				setOptions(defaultOptions);
				setReadError(true);
			},
		);
	}, []);

	useEffect(() => {
		if (!readError) {
			return;
		}
		const timer = setTimeout(() => {
			setReadError(false);
		}, 6000);
		return () => {
			clearTimeout(timer);
		};
	}, [readError]);

	function update(changes: Partial<Options>): void {
		setOptions((previous) => previous && { ...previous, ...changes });
		sync?.set(changes).catch((err: unknown) => {
			console.error("couldn't save options", err);
		});
	}

	return (
		<main className="mx-auto flex max-w-160 flex-col gap-8 px-4 py-14 sm:px-8">
			<header className="flex flex-col gap-1.5">
				<h1 className="font-semibold text-4xl tracking-tight">
					{copy.optionsTitle}
				</h1>
				<span className="text-[15px] text-muted-foreground">
					{copy.optionsSubtitle}
				</span>
			</header>
			{readError ? (
				<p
					role="alert"
					className="rounded-xl border border-primary px-4 py-3 text-sm"
				>
					{copy.optionsReadError}
				</p>
			) : null}
			{options === undefined ? null : (
				<Section>
					{outputSwitches.map((name) => (
						<SwitchRow
							key={name}
							label={copy[name]}
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
			)}
		</main>
	);
}
