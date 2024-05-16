import Alert from "@mui/material/Alert";
import Container from "@mui/material/Container";
import CssBaseline from "@mui/material/CssBaseline";
import FormControlLabel from "@mui/material/FormControlLabel";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import Snackbar from "@mui/material/Snackbar";
import Stack from "@mui/material/Stack";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import Switch from "@mui/material/Switch";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import Head from "next/head";
import {
  ChangeEvent,
  ReactElement,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import StaticImage from "../components/static-image";
import {
  defaultOptions,
  Options,
  optionsSchema,
  SkinTone,
} from "../src/options";

type PartialOptions = Partial<Options>;

// This make sure that public assets also get the proper path
const publicPrefix =
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  globalThis.process?.env?.NODE_ENV === "production" ? "/out" : "";

function Hero(): ReactElement {
  return (
    <div>
      <Stack direction="row" justifyContent="space-around">
        <StaticImage
          alt="ascii-math"
          src={`${publicPrefix}/am.svg`}
          width={128}
          height={128}
        />
      </Stack>
      <Typography variant="h2" align="center">
        Ascii Math Unicode Options
      </Typography>
    </div>
  );
}

function OptRow({
  text,
  value,
  setValue,
}: {
  text: string;
  value: boolean | undefined;
  setValue: (val: boolean) => void;
}): ReactElement {
  const disabled = value === undefined;
  const change = useCallback(
    (evt: ChangeEvent<HTMLInputElement>) => {
      setValue(evt.target.checked);
    },
    [setValue],
  );
  const toggle = (
    <Switch checked={value ?? disabled} disabled={disabled} onChange={change} />
  );
  return <FormControlLabel control={toggle} label={text} />;
}

const BASE_EMOJI = "✊";

function SkinToneRow({
  value,
  setValue,
}: {
  value: SkinTone | undefined;
  setValue: (val: SkinTone) => void;
}): ReactElement {
  const disabled = value === undefined;
  const change = useCallback(
    (evt: SelectChangeEvent<SkinTone>) => {
      setValue(evt.target.value as SkinTone);
    },
    [setValue],
  );
  const select = (
    <Select
      value={value ?? "Default"}
      disabled={disabled}
      onChange={change}
      sx={{ mr: 2 }}
    >
      <MenuItem value="Default">{BASE_EMOJI}</MenuItem>
      <MenuItem value="Dark">{BASE_EMOJI}&#127999;</MenuItem>
      <MenuItem value="Medium Dark">{BASE_EMOJI}&#127998;</MenuItem>
      <MenuItem value="Medium">{BASE_EMOJI}&#127997;</MenuItem>
      <MenuItem value="Medium Light">{BASE_EMOJI}&#127996;</MenuItem>
      <MenuItem value="Light">{BASE_EMOJI}&#127995;</MenuItem>
    </Select>
  );
  return (
    <FormControlLabel
      control={select}
      label="Set the default skin tone for emoji created using :emoji: syntax"
    />
  );
}

const configs = [
  // eslint-disable-next-line spellcheck/spell-checker
  ["pruneParens", "Prune parentheses when implied by fractions, etc."],
  [
    "vulgarFractions",
    "Render simple fractions as vulgar fractions (e.g. '\u00bd')",
  ],
  [
    "scriptFractions",
    "When rendering fractions, if the numerator and denominator can be rendered as super- and subscripts respectively then render the fraction in this form",
  ],
] as const;

function OptionRows({
  options,
  setOptions,
}: {
  options: PartialOptions;
  setOptions: (opt: PartialOptions) => void;
}): ReactElement {
  const rows = configs.map(([name, text]) => {
    const setVal = useCallback(
      (val: boolean) => {
        setOptions({ ...options, [name]: val });
      },
      [options, setOptions],
    );
    return (
      <OptRow key={name} text={text} value={options[name]} setValue={setVal} />
    );
  });

  return <>{rows}</>;
}

const unknownOptions: PartialOptions = Object.fromEntries(
  Object.keys(defaultOptions).map((key) => [key, undefined]),
);
const sync: chrome.storage.SyncStorageArea | undefined =
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  globalThis.chrome?.storage?.sync;

export default function OptionsPage(): ReactElement {
  // auto dark mode
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");
  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: prefersDarkMode ? "dark" : "light",
        },
      }),
    [prefersDarkMode],
  );

  // current options
  const [options, setOptions] = useState(unknownOptions);

  // whether showing warning about login
  const [alerting, setAlerting] = useState(false);
  const stopAlerting = useCallback(() => {
    setAlerting(false);
  }, [setAlerting]);

  // read options first time
  useEffect(() => {
    if (options !== unknownOptions) {
      // nothing
    } else if (sync !== undefined) {
      sync.get(defaultOptions, (opts) => {
        if (optionsSchema.guard(opts)) {
          setOptions(opts);
        } else {
          setAlerting(true);
          setOptions(defaultOptions);
        }
      });
    } else {
      // only when testing
      setOptions(defaultOptions);
    }
  }, [options === unknownOptions]);

  const setSkinTone = useCallback(
    (val: SkinTone) => {
      setOptions({ ...options, skinTone: val });
    },
    [options, setOptions],
  );

  // persist options when changed
  useEffect(() => {
    if (options !== unknownOptions && sync !== undefined) {
      void sync.set(options);
    }
  }, [options]);

  return (
    <ThemeProvider theme={theme}>
      <Head>
        <title>Ascii Math Unicode Options</title>
        {/* head gets compiled separately and doesn't seem to work with publicPrefic */}
        {/* eslint-disable-next-line spellcheck/spell-checker */}
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <CssBaseline />
      <Snackbar open={alerting} autoHideDuration={6000} onClose={stopAlerting}>
        <Alert onClose={stopAlerting} severity="warning">
          Error reading options; resetting to default
        </Alert>
      </Snackbar>
      <Container maxWidth="sm">
        <Stack spacing={1}>
          <Hero />
          <OptionRows options={options} setOptions={setOptions} />
          <SkinToneRow value={options.skinTone} setValue={setSkinTone} />
        </Stack>
      </Container>
    </ThemeProvider>
  );
}
