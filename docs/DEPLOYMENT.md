# GitHub and static deployment

## Upload to GitHub

1. Unzip `blendor-source.zip` and open its `blendor` folder.
2. Create an empty GitHub repository and upload the folder's **contents**, including `.github`, `.gitignore`, and `.prettierrc.json`.
3. Or initialize Git in that folder and push it to your repository using GitHub's normal instructions.
4. CI verifies the source and creates a downloadable static build artifact on pushes and pull requests.

No repository has been created automatically. The package contains no hosting credentials or account-specific Sites configuration. Choose a license and verify rights to any future artwork before public distribution.

## GitHub Pages

1. In repository **Settings → Pages**, choose **GitHub Actions** as the build source.
2. Open **Actions → Deploy GitHub Pages → Run workflow** on the default branch.
3. The workflow verifies the app, builds `dist/`, and deploys it. GitHub provides the resulting URL.

Deployment is manual so uploading the repository alone does not publish the game. Relative file paths support repository subdirectories. GitHub Pages availability and audience depend on your account and repository settings; confirm the intended visibility before running the workflow. See [GitHub's custom workflow documentation](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages).

## Vercel

Import this repository with the repository root as Root Directory and Framework Preset **Other**. The root `vercel.json` declares `npm run build` and Output Directory `dist`; `package.json` pins Node.js to `22.x`.

Commit and push `vercel.json` together with `package.json` and `package-lock.json`, then deploy that new commit. Redeploying the older commit will not include the fix. If manually configuring the dashboard, use:

- Build Command: `npm run build`
- Output Directory: `dist`
- Node.js Version: `22.x`

The build intentionally generates `dist/index.html`; there is no `public` directory. The npm `cache-dir` warning in Vercel's install log is separate from the missing-output error and does not prevent the build from completing. This repository does not configure `cache-dir`.

See [Vercel output directory configuration](https://vercel.com/docs/project-configuration/vercel-json#outputdirectory) and [Node.js versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

## Other static hosts

Use Node.js 22, build command `npm ci && npm run verify && npm run build`, and publish directory `dist`. No server runtime, API keys, environment variables, or SPA rewrite is required. Alternatively, unzip `blendor-deploy.zip` directly into a static host's public directory. Serve through HTTP(S), not by opening index.html as a local file, because the app uses ES modules.

The current app stores local matches in each browser. Static deployment does not turn it into online multiplayer. A future online backend will have its own deployment and authenticated network API; see ARCHITECTURE.md.
