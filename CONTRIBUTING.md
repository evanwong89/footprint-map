# Contributing

Thanks for helping improve Footprint Map.

## Development setup

Requirements: Node.js 20 or later and a test Obsidian vault.

```sh
npm ci
npm run check
```

For local Obsidian testing, copy `release/footprint-map/main.js`, `manifest.json`, and `styles.css` into a dedicated test vault under `.obsidian/plugins/footprint-map/`. Do not test against irreplaceable notes without a backup.

## Pull requests

- Keep footprint data and rendering core independent from Obsidian-specific APIs.
- Do not add telemetry, advertising, or background network requests.
- Never commit API keys, tokens, real vaults, private photos, or location history.
- Use synthetic or explicitly publishable fixtures.
- Preserve provider attribution and document any new network service.
- Add or update tests for behaviour changes.
- Run `npm run check` before opening a pull request.
- Keep user-facing English and Simplified Chinese strings in sync.

## Generated files

Do not commit `node_modules/`, `dist/`, `release/`, `test-vault/`, coverage output, or release archives. Compiled plugin assets belong in GitHub Releases rather than the source branch.
