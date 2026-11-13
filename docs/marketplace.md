# Marketplace release checklist

This is the human maintainer's checklist for publishing Arcus 0.1.0 and installing it from the Home Assistant Marketplace. The repository is ready to publish, but it has no remote and no release yet. Nothing here is automated by the agent.

Repository: `liltoto/ha-arcus`
Marketplace type: **Dashboard** (`plugin` in `hacs.json` and the HACS action)
Minimum Home Assistant: **2026.11.0**

## 0. Pre-flight

Run these from the repository root. All must pass before a tag exists.

- [ ] Commit the documentation and packaging changes on `main`. The agent intentionally did not commit; the publish commands below push commits, not the working tree.
- [ ] `git status` is clean.
- [ ] `npm ci`
- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] `npm run visual` (install Playwright browsers once with `npx playwright install chromium`)
- [ ] `npm run build`
- [ ] `test -f dist/arcus.js && node --check dist/arcus.js`
- [ ] `! grep -Eq "fonts.googleapis|unpkg|cdn.jsdelivr" dist/arcus.js`
- [ ] `grep -c "data:font/woff2" dist/arcus.js` returns `2` (Fraunces and Inter Tight are embedded).
- [ ] `examples/hjem.yaml` parses as JSON/YAML and matches the strategy and card shapes.
- [ ] `hacs.json` is exactly:

  ```json
  {
    "name": "Arcus",
    "filename": "arcus.js",
    "homeassistant": "2026.11.0"
  }
  ```

## 1. Create the public repository

- [ ] Confirm the GitHub account owns `liltoto` and that `ha-arcus` does not already exist.
- [ ] Create the repository from this working tree, on `main`:

  ```bash
  gh repo create liltoto/ha-arcus --public --source=. --remote=origin --push
  ```

  If the repository already exists, add the remote and push instead:

  ```bash
  git remote add origin https://github.com/liltoto/ha-arcus.git
  git push -u origin main
  ```

- [ ] Confirm the repository is public. The Marketplace only reads public GitHub repositories.

## 2. Repository settings

- [ ] Set the description:

  ```bash
  gh repo edit liltoto/ha-arcus \
    --description "The arc of the day — a calm, dynamic Home Assistant dashboard." \
    --add-topic home-assistant \
    --add-topic hacs \
    --add-topic lovelace \
    --add-topic dashboard \
    --add-topic custom-card \
    --enable-issues
  ```

- [ ] Confirm on the repository page:
  - description is visible;
  - topics are `home-assistant`, `hacs`, `lovelace`, `dashboard`, `custom-card`;
  - **Issues** is on.

These are required by the catalog review and checked by the HACS action.

## 3. Tag and release

The release workflow (`.github/workflows/release.yml`) runs on `v*` tags. It runs `npm ci`, typecheck, tests, and the build, verifies the bundle, and attaches `dist/arcus.js` to the GitHub release.

- [ ] Push `main` and confirm the CI workflow is green, including the HACS validation step with `category: plugin`.
- [ ] Create an annotated tag:

  ```bash
  git tag -a v0.1.0 -m "Arcus 0.1.0"
  git push origin main --tags
  ```

- [ ] Wait for the **Release** workflow to finish successfully.
- [ ] Verify the release is a full GitHub release, not a draft or a tag without assets:

  ```bash
  gh release view v0.1.0 --json tagName,isDraft,isPrerelease,assets
  ```

- [ ] The asset list contains exactly `arcus.js`. Verify it matches the local build:

  ```bash
  mkdir -p /tmp/arcus-release
  gh release download v0.1.0 --pattern arcus.js --dir /tmp/arcus-release
  cmp dist/arcus.js /tmp/arcus-release/arcus.js
  ```

  The Marketplace looks in release assets first. An asset named `arcus.js` is what `filename` in `hacs.json` points to. If the asset is missing, the Marketplace falls back to the repository root and then `dist`; do not rely on that fallback for a release.

- [ ] Copy the URL of the passing HACS action run. The catalog pull request asks for it.

## 4. Verify the HACS action

- [ ] Open **Actions → CI** on `main`.
- [ ] Confirm the `hacs/action@main` step with `category: plugin` passes without any `ignore` input.
- [ ] If it fails, fix the reported check (description, topics, issues, images, `hacs.json`, or repository state) and push again. Do not tag a release until it is green.

The HACS action runs on every push and pull request, not on the tag. The catalog review uses the same checks.

## 5. Install from the Marketplace

This is the user's action. The GitHub connection is theirs; do not connect it for them.

- [ ] On the Home Assistant instance (2026.11 or newer), open **Settings → Marketplace**.
- [ ] Select **Add from link** in the upper-right corner.
- [ ] Enter `https://github.com/liltoto/ha-arcus` and select **Add**.
  - If asked to connect GitHub, complete the device sign-in. The connection reads public repository information only.
  - If the type is not detected, choose **Dashboard** and add it again.
- [ ] Open **Arcus** and select **Install**.
- [ ] Reload the browser, then hard refresh (`Ctrl+Shift+R` / `Cmd+Shift+R`).
- [ ] Check **Settings → Dashboards → Resources** for `/local/community/ha-arcus/arcus.js?v=...`, type **JavaScript module**. There must be one Arcus resource, not two.

## 6. Create and verify the dashboard

- [ ] Open **Settings → Dashboards → Add dashboard**.
- [ ] Choose the **Arcus** strategy. If it is not offered, create a dashboard from scratch and paste the strategy block from `examples/hjem.yaml` into the raw configuration editor.
- [ ] Save and open the dashboard. The generated view path is `hjem`, so the URL is `/arcus-hjem/hjem` for a dashboard with `url_path: arcus-hjem`.
- [ ] Verify against the old `hjem-dognet` dashboard:
  - [ ] all rooms, names, temperatures, humidity, lights, openings, and batteries;
  - [ ] the arc, prayer times, weather, vitals, and forecast;
  - [ ] energy and all five solar tabs;
  - [ ] water, security, tech, economy, prayers, alerts, and ventilation sheets;
  - [ ] lights and heating controls;
  - [ ] quick actions;
  - [ ] density, language, appearance, and atmosphere;
  - [ ] 360 px and 390 px widths with no horizontal scroll;
  - [ ] browser console has no errors and logs `Arcus v0.1.0`.
- [ ] Use the dashboard for at least one session before removing anything.

## 7. Do not remove the old dashboard yet

- [ ] Leave the existing `hjem-dognet` dashboard and its two inline resources untouched.
- [ ] Keep the rollback export at `docs/migration/hjem-dognet.json`. If it does not exist yet, export the old dashboard before changing anything.
- [ ] Only after the user confirms the new dashboard is correct:
  - hide or delete `hjem-dognet`;
  - delete the two old inline dashboard resources;
  - verify no dashboard references `custom:hjem-dognet`.

If the new dashboard is wrong, uninstall Arcus from the Marketplace (it removes the files and the resource), delete the new `arcus-hjem` dashboard, and keep using `hjem-dognet`. Nothing in this release changes the old dashboard.

## 8. Catalog submission (later)

Users can install Arcus from the repository link immediately. To make it appear in the catalog without a link, submit it to `hacs/default` after the release is stable.

- [ ] Fork `hacs/default` and create a branch from `master`.
- [ ] Add `liltoto/ha-arcus` to the `plugin` file (JSON list) in alphabetical order. Do not append it at the end.
- [ ] Open the pull request from your personal account, not an organization.
- [ ] Fill in the template completely:
  - [ ] link to the `v0.1.0` release;
  - [ ] link to the passing HACS action run with `category: plugin`, without `ignore`;
  - [ ] the checklist.
- [ ] Expect review to take a while. New additions can take months. Until then, the custom repository link is the supported install path.

## Release record

| Item | Value |
| --- | --- |
| Version | `0.1.0` |
| Tag | `v0.1.0` |
| Release asset | `arcus.js` |
| Marketplace type | Dashboard / `plugin` |
| Minimum Home Assistant | `2026.11.0` |
| HACS action | `hacs/action@main`, `category: plugin` |
| Old dashboard | `hjem-dognet`, untouched until approval |
