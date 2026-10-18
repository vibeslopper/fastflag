## Worldie

### Build the CSS

Install the Tailwind CSS v4 standalone CLI for your operating system and place its executable in the repository root as `tailwindcss` (it is a local build tool, not a site dependency):

```sh
./tailwindcss -i ./src/input.css -o ./output.css --minify
```

The generated `output.css` is the production stylesheet and should be committed. Tailwind scans `index.html` and `app.js`; keep class names written out in full in those files. The CLI is only used to build CSS; the deployed site remains static.

### Check the flag data

With Node.js installed, run:

```sh
node check-data.js
```

The script reports totals by flag category and continent, the overall count, duplicate or invalid codes, invalid categories or capital aliases, missing country capitals, and any code without a `data/flags/4x3/<code>.svg` file. It exits with a non-zero status if a check fails.

### Run locally

Open `index.html` directly in a browser, or serve this folder with any static web server. No build step is needed for JavaScript, and the page makes no runtime data or CDN requests.

### Deploy to GitHub Pages

1. Commit the site files, including the generated `output.css` and the required `data/flags/` SVG files.
2. Push the repository to GitHub on the `main` branch.
3. In the repository, open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select branch **main** and folder **/ (root)**, then save.
6. Wait for GitHub Pages to publish the site and open the URL shown in the Pages settings.

The empty `.nojekyll` file tells GitHub Pages not to run Jekyll over the site.
