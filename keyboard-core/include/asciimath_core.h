#ifndef ASCIIMATH_CORE_H
#define ASCIIMATH_CORE_H

#include <stdbool.h>
#include <stdint.h>

/* Skin tones, numbered as `asciimath_convert` takes them. */
enum {
    ASCIIMATH_TONE_DEFAULT = 0,
    ASCIIMATH_TONE_LIGHT = 1,
    ASCIIMATH_TONE_MEDIUM_LIGHT = 2,
    ASCIIMATH_TONE_MEDIUM = 3,
    ASCIIMATH_TONE_MEDIUM_DARK = 4,
    ASCIIMATH_TONE_DARK = 5,
};

/*
 * Convert nul-terminated utf-8 ascii math to unicode. Returns a string to release with
 * `asciimath_free`, or NULL if `input` is NULL or not utf-8.
 */
char *_Nullable asciimath_convert(const char *_Nullable input, bool strip_brackets,
                                  bool vulgar_fracs, bool script_fracs, uint8_t skin_tone,
                                  bool placeholders);

void asciimath_free(char *_Nullable text);

#endif
