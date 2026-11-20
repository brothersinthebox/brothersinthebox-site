# Brothers in the Box — website

Two pages:

- **index.html**: the homepage with the 3D puck that scrolling drives, plus a "Latest episode" card.
- **episodes.html**: every episode as a card. Each one has its own page with an audio player, the show notes, Player of the Week and guests (for example `episodes.html?ep=60`).

New episodes show up on their own. The site reads your Riverside RSS feed through a small server helper (`netlify/functions/episodes.mjs`). Browsers can't read the feed directly, which is why the helper is needed. If the feed can't be reached, the site falls back to the saved copy in `data/episodes.json`.

## Put it online (Netlify, free)

The helper only runs when Netlify builds the site from a GitHub repo or the Netlify CLI. If you drag and drop the folder, the site still works, but it only shows the saved episode list.

1. Make a free GitHub account, create a new repository (for example `brothersinthebox-site`) and upload everything in this folder. That includes the hidden `.github` folder: on a Mac, press Cmd+Shift+. in Finder to see it.
2. Make a free Netlify account, choose **Add new site → Import an existing project → GitHub**, and pick the repo. Leave the build settings blank (`netlify.toml` sets them). Deploy.
3. Open `https://YOUR-SITE.netlify.app/api/episodes`. You should see the episode list as text. That means the live feed is working.
4. **Domain:** in Netlify, go to **Domain management → Add a domain** and follow the steps for the domain you bought.

## After you have a domain

- In `index.html` and `episodes.html`, change `content="assets/og-image.jpg"` to the full address, for example `content="https://brothersinthebox.ca/assets/og-image.jpg"`. That makes the preview image show when people share the link.
- Add the site to Google Search Console (search.google.com/search-console) so it shows up in search.
- Check the **Newsletter** link works. It points to `https://brothersinthebox.riverside.com/newsletter`, which is a best guess.

## Changing things

- **Player of the Week, guests and episode type** for older episodes are in the `META` list at the top of `assets/episodes-data.js`. New episodes work out their Player of the Week from the description when it's written like "Player of the Week is …" and "… grabs the honourable mention". Add a line to `META` to override it.
- **Colours** are at the top of `assets/site.css`.
- **Homepage text** is in `index.html`.
- **Recording a reel:** open the homepage with `?autoplay` on the end of the address and the puck plays through every scene on its own.

## Backup episode list

`data/episodes.json` is a saved copy used only when the live feed fails. The GitHub Action in `.github/workflows/update-episodes.yml` refreshes it every day, which also adds the audio links to the saved copy. To refresh it yourself, run `node scripts/update-episodes.mjs` (Node 18 or newer).

## Files

```
index.html, episodes.html, 404.html   pages
assets/                               styles, scripts, logos, 3D library (three.js r158)
data/episodes.json                    saved copy of the episode list
lib/feed.mjs                          reads the RSS feed
netlify/functions/episodes.mjs        the live-feed helper (/api/episodes)
scripts/update-episodes.mjs           refreshes the saved copy
.github/workflows/                    daily refresh of the saved copy
netlify.toml                          Netlify settings
```
