import React, { ReactElement, useEffect, useState } from "react";
import {
  Heading,
  Image,
  Flex,
  HStack,
  VStack,
  Switch,
  Spinner,
  Text,
  ChakraProvider,
} from "@chakra-ui/react";

import { Options, defaultOptions, isOptions } from "./options";

function Hero(): ReactElement {
  return (
    <>
      <Image src="./images/am.svg" />
      <Heading lineHeight="normal">Ascii Math Unicode Options</Heading>
    </>
  );
}

function OptRow({
  text,
  value,
  setValue,
}: {
  text: string;
  value: boolean;
  setValue: (val: boolean) => void;
}): ReactElement {
  return (
    <HStack width="full" justifyContent="space-between">
      <Text fontSize="lg">{text}</Text>
      <Switch
        size="lg"
        isChecked={value}
        onChange={(evt) => setValue(evt.target.checked)}
      />
    </HStack>
  );
}

function OptionRows({
  options,
  setOptions,
}: {
  options: Options;
  setOptions: (opt: Options) => void;
}): ReactElement {
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
  const rows = configs.map(([name, text]) => (
    <OptRow
      key={name}
      text={text}
      value={options[name]}
      setValue={(val) => setOptions({ ...options, [name]: val })}
    />
  ));

  return <VStack width="full">{rows}</VStack>;
}

function Loading(): ReactElement {
  return (
    <Flex flexGrow={1} width="full" justifyContent="center">
      <Spinner />
    </Flex>
  );
}

export default function OptionsPage(): ReactElement {
  const [options, setOptions] = useState<Options | undefined>(undefined);

  // read options first time
  useEffect(() => {
    if (!options) {
      chrome.storage.sync.get(defaultOptions, (opts) => {
        if (isOptions(opts)) setOptions(opts);
      });
    }
  }, [!options]);

  // persist options when changed
  useEffect(() => {
    if (options) void chrome.storage.sync.set(options);
  }, [options]);

  const body = options ? (
    <OptionRows options={options} setOptions={setOptions} />
  ) : (
    <Loading />
  );

  return (
    <ChakraProvider>
      <VStack maxWidth="xl" margin="0 auto">
        <Hero />
        {body}
      </VStack>
    </ChakraProvider>
  );
}
