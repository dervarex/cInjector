#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

if [[ -f .env ]]; then
  set -a
  source .env
  set +a
fi

IGNORE=(
  "screenshots" "screenshots/**" "examples" "examples/**"
  "README.md" "package.json" "package-lock.json" "package.sh" "amo-metadata.json"
)

rm -rf editor/dist
npm run build
npx web-ext lint --ignore-files "${IGNORE[@]}"
npx web-ext build --overwrite-dest --ignore-files "${IGNORE[@]}"

if [[ "${SIGN:-1}" == 1 && -n "${jwt_issuer:-}" && -n "${jwt_secret:-}" ]]; then
  git archive --format=zip -o web-ext-artifacts/source.zip HEAD
  npx web-ext sign \
    --channel="${CHANNEL:-unlisted}" \
    --api-key="$jwt_issuer" --api-secret="$jwt_secret" \
    --upload-source-code=web-ext-artifacts/source.zip \
    --amo-metadata=amo-metadata.json \
    --ignore-files "${IGNORE[@]}"
fi
