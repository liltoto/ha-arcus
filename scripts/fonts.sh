#!/usr/bin/env bash
#
# Regenerate the self-contained Arcus webfonts.
#
# Fraunces and Inter Tight are both SIL Open Font License variable fonts.
# We keep the Latin/Latin-1/Latin Extended-A range plus the punctuation the
# dashboard uses, and emit woff2 files that esbuild inlines as data URLs.
#
# Usage: ./scripts/fonts.sh
set -euo pipefail

cd "$(dirname "$0")/.."
DEST="assets/fonts"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$DEST"

FRAUNCES_TTF="$TMP/fraunces.ttf"
INTER_TIGHT_TTF="$TMP/inter-tight.ttf"
FRAUNCES_WOFF2="$DEST/fraunces-latin.woff2"
INTER_TIGHT_WOFF2="$DEST/inter-tight-latin.woff2"

# U+0000-00FF  Basic Latin + Latin-1 Supplement (æ ø å, °, ·)
# U+0100-017F  Latin Extended-A
# U+2000-206F  General punctuation (– — ‘ ’ “ ” …)
# U+20AC       Euro
# U+2122       Trade mark
# U+2190-2193  Arrows (→)
UNICODES="U+0000-00FF,U+0100-017F,U+2000-206F,U+20AC,U+2122,U+2190-2193"

fetch_latin_woff2() {
  local family="$1"
  local out="$2"
  local ua="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  local css url
  css="$(curl -fsSL -A "$ua" "https://fonts.googleapis.com/css2?family=${family}&display=swap")"
  url="$(printf '%s\n' "$css" | awk '
    index($0, "/* latin */") { seen = 1; next }
    seen && /src: url\(/ {
      sub(/^.*src: url\(/, "")
      sub(/\).*$/, "")
      print
      exit
    }
  ')"
  if [ -z "$url" ]; then
    echo "Could not find a Latin woff2 URL for ${family}." >&2
    exit 1
  fi
  curl -fsSL "$url" -o "$out"
}

echo "Downloading OFL licences…"
curl -fsSL "https://raw.githubusercontent.com/google/fonts/main/ofl/fraunces/OFL.txt" -o "$DEST/OFL-Fraunces.txt"
curl -fsSL "https://raw.githubusercontent.com/google/fonts/main/ofl/intertight/OFL.txt" -o "$DEST/OFL-InterTight.txt"

echo "Downloading upstream variable fonts…"
curl -fsSL "https://github.com/google/fonts/raw/main/ofl/fraunces/Fraunces%5BSOFT,WONK,opsz,wght%5D.ttf" -o "$FRAUNCES_TTF"
curl -fsSL "https://github.com/google/fonts/raw/main/ofl/intertight/InterTight%5Bwght%5D.ttf" -o "$INTER_TIGHT_TTF"

SUBSET=()
if pyftsubset --help >/dev/null 2>&1; then
  SUBSET=(pyftsubset)
elif python3 -c "import fontTools" >/dev/null 2>&1; then
  SUBSET=(python3 -m fontTools.subset)
fi

if [ "${#SUBSET[@]}" -gt 0 ]; then
  echo "Subsetting with ${SUBSET[*]}…"
  "${SUBSET[@]}" "$FRAUNCES_TTF" \
    --output-file="$FRAUNCES_WOFF2" \
    --flavor=woff2 \
    --unicodes="$UNICODES" \
    --layout-features='*'
  "${SUBSET[@]}" "$INTER_TIGHT_TTF" \
    --output-file="$INTER_TIGHT_WOFF2" \
    --flavor=woff2 \
    --unicodes="$UNICODES" \
    --layout-features='*'
else
  # fontTools (or its brotli support) is unavailable. Google's own Latin
  # subsets are variable-font woff2 files, so the bundle stays self-contained.
  echo "fontTools unavailable; falling back to Google's Latin woff2 subsets…"
  fetch_latin_woff2 "Fraunces:opsz,wght@9..144,100..900" "$FRAUNCES_WOFF2"
  fetch_latin_woff2 "Inter+Tight:wght@100..900" "$INTER_TIGHT_WOFF2"
fi

echo "Wrote:"
ls -lh "$FRAUNCES_WOFF2" "$INTER_TIGHT_WOFF2" "$DEST/OFL-Fraunces.txt" "$DEST/OFL-InterTight.txt"
