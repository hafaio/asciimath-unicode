<!-- @component the extension's options page -->
<script lang="ts">
    import "../../theme.css";
    import { copy } from "../../copy.ts";
    import { delimiterNames, delimiters } from "../../delimiters.ts";
    import { openShortcutSettings } from "../../hotkey.ts";
    import {
        defaultOptions,
        type Options,
        optionsSchema,
        parseOptions,
        type SkinTone,
    } from "../../options.ts";
    import {
        outputSwitches,
        useExamples,
        useShortcut,
    } from "../../options-state.svelte.ts";
    import Section from "../../section.svelte";
    import SwitchRow from "../../switch-row.svelte";
    import Button from "../../ui/button.svelte";
    import Kbd from "../../ui/kbd.svelte";
    import KbdGroup from "../../ui/kbd-group.svelte";
    import ToggleGroup from "../../ui/toggle-group.svelte";
    import ToggleGroupItem from "../../ui/toggle-group-item.svelte";
    import Usage from "../../usage.svelte";

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

    async function loadOptions(): Promise<{
        options: Options;
        repaired: boolean;
    }> {
        if (sync === undefined) {
            return { options: defaultOptions, repaired: false };
        }
        const stored = await sync.get<Record<string, unknown>>(defaultOptions);
        const { options, invalid } = parseOptions(stored);
        if (invalid.length > 0) {
            await sync.set(
                Object.fromEntries(
                    invalid.map((key) => [key, defaultOptions[key]]),
                ),
            );
        }
        return { options, repaired: invalid.length > 0 };
    }

    let options = $state.raw<Options>();
    let repaired = $state(false);
    let saves = $state(0);
    const shortcut = useShortcut();
    const examples = useExamples(() => saves);

    $effect(() => {
        loadOptions().then(
            (loaded) => {
                ({ options, repaired } = loaded);
                saves += 1;
            },
            (err: unknown) => {
                console.error("couldn't load options", err);
                options = defaultOptions;
                repaired = true;
            },
        );
    });

    $effect(() => {
        if (!repaired) {
            return;
        }
        const timer = setTimeout(() => {
            repaired = false;
        }, 6000);
        return () => {
            clearTimeout(timer);
        };
    });

    function exampleDetail(math: string): string {
        const converted = examples.converted[math];
        return converted === undefined ? math : `${math} → ${converted}`;
    }

    function update(changes: Partial<Options>): void {
        if (options !== undefined) {
            options = { ...options, ...changes };
        }
        sync?.set(changes).then(
            () => {
                saves += 1;
            },
            (err: unknown) => {
                console.error("couldn't save options", err);
            },
        );
    }
</script>

<main class="mx-auto flex max-w-280 flex-col gap-8 px-4 py-14 sm:px-8">
    <header class="flex flex-col gap-1.5">
        <h1 class="font-semibold text-4xl tracking-tight">
            {copy.optionsTitle}
        </h1>
        <span class="text-[15px] text-muted-foreground">
            {copy.optionsSubtitle}
        </span>
    </header>
    {#if repaired}
        <p
            role="alert"
            class="rounded-xl border border-primary px-4 py-3 text-sm"
        >
            {copy.optionsReadError}
        </p>
    {/if}
    <Usage delimiter={options?.delimiter ?? defaultOptions.delimiter} />
    {#if options !== undefined}
        <div class="grid grid-cols-1 items-start gap-5 md:grid-cols-2">
            <div class="flex flex-col gap-5">
                <Section title={copy.sectionTurningOn}>
                    <div class="flex flex-wrap items-center gap-4 px-6 py-4.5">
                        <span class="grow font-medium text-[15px]">
                            {copy.hotkeyHeading}
                        </span>
                        {#if shortcut.keys === null}
                            <span
                                class="basis-full text-[13px] text-muted-foreground"
                            >
                                {copy.hotkeyMissing}
                            </span>
                        {:else}
                            <KbdGroup>
                                {#each shortcut.keys ?? [] as key (key)}
                                    <Kbd>{key}</Kbd>
                                {/each}
                            </KbdGroup>
                        {/if}
                        <Button
                            variant="outline"
                            disabled={!globalThis.chrome?.commands}
                            onclick={() => {
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
                    <div class="flex flex-col gap-3.5 px-6 py-4.5">
                        <span class="font-medium text-[15px]"
                            >{copy.delimiter}</span
                        >
                        <ToggleGroup
                            aria-label={copy.delimiter}
                            bind:value={
                                () => options?.delimiter ?? "",
                                (value) => {
        const parsed = optionsSchema.shape.delimiter.safeParse(value);
        if (parsed.success) {
            update({ delimiter: parsed.data });
        }
    }
                            }
                        >
                            {#each delimiterNames as name (name)}
                                <ToggleGroupItem
                                    value={name}
                                    class="h-9 rounded-full px-3.5 font-mono text-sm"
                                >
                                    {delimiters[name].display}
                                </ToggleGroupItem>
                            {/each}
                        </ToggleGroup>
                    </div>
                </Section>
            </div>
            <Section title={copy.sectionOutput}>
                {#each outputSwitches as [name, math] (name)}
                    <SwitchRow
                        label={copy[name]}
                        detail={exampleDetail(math)}
                        mono
                        checked={options[name]}
                        onChange={(checked) => {
                            update({ [name]: checked });
                        }}
                    />
                {/each}
                <div class="flex flex-col gap-3 px-6 py-4.5">
                    <span class="font-medium text-[15px]">{copy.skinTone}</span>
                    <ToggleGroup
                        aria-label={copy.skinTone}
                        bind:value={
                            () => options?.skinTone ?? "",
                            (value) => {
        const parsed = optionsSchema.shape.skinTone.safeParse(value);
        if (parsed.success) {
            update({ skinTone: parsed.data });
        }
    }
                        }
                    >
                        {#each optionsSchema.shape.skinTone
                            .options as tone (tone)}
                            <ToggleGroupItem
                                value={tone}
                                aria-label={copy.skinToneNames[tone]}
                                class="size-11 rounded-xl text-[22px] data-[state=on]:border-2 data-[state=on]:bg-primary/15 data-[state=on]:text-foreground"
                            >
                                {skinToneEmoji[tone]}
                            </ToggleGroupItem>
                        {/each}
                    </ToggleGroup>
                </div>
            </Section>
        </div>
    {/if}
</main>
