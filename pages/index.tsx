import Head from "next/head";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import useMediaQuery from "@mui/material/useMediaQuery";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import React, {
  ReactElement,
  ChangeEvent,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { Options, defaultOptions, isOptions } from "../src/options";

type PartialOptions = Partial<Options>;

// This make sure that public assets also get the proper path
const publicPrefix =
  globalThis.process?.env?.NODE_ENV === "production" ? "/out" : "";

function Hero(): ReactElement {
  return (
    <>
      <Stack direction="row" justifyContent="space-around">
        <img src={`${publicPrefix}/am.svg`} />
      </Stack>
      <Typography variant="h2" align="center">
        Ascii Math Unicode Options
      </Typography>
    </>
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
    (evt: ChangeEvent<HTMLInputElement>) => setValue(evt.target.checked),
    [setValue]
  );
  const toggle = (
    <Switch checked={value ?? disabled} disabled={disabled} onChange={change} />
  );
  return <FormControlLabel control={toggle} label={text} />;
}

const configs = [
  ["preserveWhitespace", "Preserve whitespace when converting"],
  ["pruneParens", "Prune parentheses when implied by fractions, etc."],
  [
    "vulgarFractions",
    "Render simple fractions as vulgar fractions (e.g. '\u00bd')",
  ],
  [
    "fractionSlash",
    "When rendering fractions use the unicode fraction slash (\u2044) instead of the solidus (/)",
  ],
  ["convertFractions", "Convert fractions (e.g. 'frac a b' to 'a/b')"],
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
      (val: boolean) => setOptions({ ...options, [name]: val }),
      [options, setOptions]
    );
    return (
      <OptRow key={name} text={text} value={options[name]} setValue={setVal} />
    );
  });

  return <FormGroup>{rows}</FormGroup>;
}

const unknownOptions: PartialOptions = Object.fromEntries(
  Object.keys(defaultOptions).map((key) => [key, undefined])
);
const sync = globalThis.chrome?.storage?.sync;

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
    [prefersDarkMode]
  );

  // current options
  const [options, setOptions] = useState(unknownOptions);

  // whether showing warning about login
  const [alerting, setAlerting] = useState(false);
  const stopAlerting = useCallback(() => setAlerting(false), [setAlerting]);

  // read options first time
  useEffect(() => {
    if (options !== unknownOptions) {
      // nothing
    } else if (sync !== undefined) {
      sync.get(defaultOptions, (opts) => {
        if (isOptions(opts)) {
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
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <CssBaseline />
      <Snackbar open={alerting} autoHideDuration={6000} onClose={stopAlerting}>
        <Alert onClose={stopAlerting} severity="warning">
          Error reading options; resetting to default
        </Alert>
      </Snackbar>
      <Container maxWidth="sm">
        <Stack spacing={2}>
          <Hero />
          <OptionRows options={options} setOptions={setOptions} />
        </Stack>
      </Container>
    </ThemeProvider>
  );
}
