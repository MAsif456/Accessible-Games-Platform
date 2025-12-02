# Quick Start: Publishing Documentation to GitLab Pages

## TL;DR - 3 Commands to Publish

```bash
# 1. Add and commit all files
git add .
git commit -m "Add automated documentation with GitLab Pages"

# 2. Push to GitLab
git push origin main

# 3. Get your URL from GitLab
# Go to: Settings → Pages in your GitLab project
```

Your documentation will be live at:
```
https://YOUR-USERNAME.pages.cardiff.ac.uk/accessible-games-website/
```

## Step-by-Step Instructions

### Step 1: Commit Your Files

Make sure all documentation files are committed:

```bash
cd PlayAble
git status
```

You should see:
- `.gitlab-ci.yml` (new file for CI/CD)
- `docs/` directory with all HTML files
- Updated `.gitignore`
- Configuration files (`typedoc.json`, `package.json`)

Add everything:
```bash
git add .
git commit -m "Add automated documentation system

- Set up TypeDoc for client and server
- Create unified documentation landing page
- Configure GitLab CI/CD for automatic deployment
- Generated 303+ documentation files covering all features"
```

### Step 2: Push to GitLab

```bash
git push origin main
```

Or if your branch is named differently:
```bash
git push origin master
```

### Step 3: Wait for Build

1. Go to your GitLab project page
2. Click **CI/CD** → **Pipelines** in the left menu
3. You'll see a pipeline running (orange/blue icon)
4. Wait 2-3 minutes for it to complete (green checkmark)

### Step 4: Get Your Documentation URL

1. In GitLab, go to **Settings** → **Pages** (left sidebar)
2. You'll see something like:

   ```
   Your pages are served under:
   https://c23049129.pages.cardiff.ac.uk/accessible-games-website/
   ```

3. Click the link or copy it

### Step 5: Update Your Wiki

1. Go to your GitLab project's **Wiki**
2. Edit the page or create a new "Documentation" page
3. Copy the content from `WIKI_TEMPLATE.md`
4. Replace `YOUR-USERNAME` with your actual username
5. Save the wiki page

## Verification Checklist

✅ Pipeline completed successfully (green checkmark in CI/CD → Pipelines)

✅ Pages URL is visible in Settings → Pages

✅ Opening the URL shows the documentation landing page

✅ Can navigate to Client and Server documentation sections

✅ Search functionality works

✅ All links are clickable

## If Something Goes Wrong

### Pipeline Fails

**Check the error log:**
1. Go to **CI/CD** → **Pipelines**
2. Click on the failed pipeline (red X)
3. Click on the failed job
4. Read the error message

**Common fixes:**
- Ensure Node.js dependencies are correct in `package.json`
- Check that TypeDoc is installed: `npm install --save-dev typedoc` in both client and server
- Verify `.gitlab-ci.yml` syntax

### Pages Not Showing

**Possible causes:**

1. **Pages not enabled**: Go to **Settings** → **General** → **Visibility** and ensure "Pages" is enabled

2. **Wrong branch**: `.gitlab-ci.yml` is configured for `main` branch. If your default branch is `master`, change this in `.gitlab-ci.yml`:
   ```yaml
   only:
     - master  # Change from 'main' to 'master'
   ```

3. **First deployment delay**: First-time deployments can take 5-10 minutes

### 404 Error

If you get a 404:
- Ensure `index.html` exists in the root of the `public/` folder
- Check the pipeline succeeded
- Try accessing: `https://YOUR-USERNAME.pages.cardiff.ac.uk/PROJECT-NAME/index.html`

## Manual Deployment (Alternative)

If CI/CD isn't working, you can manually deploy:

### Option A: Direct Push to gh-pages (if using GitHub)

```bash
cd PlayAble
npm run docs
cd docs
git init
git add .
git commit -m "Deploy documentation"
git push -f https://github.com/username/repo.git main:gh-pages
```

### Option B: Download and Share

```bash
# Generate docs
cd PlayAble
npm run docs

# Create ZIP (Windows PowerShell)
Compress-Archive -Path docs/* -DestinationPath documentation.zip

# Upload to GitLab Files section
# Users can download and open index.html locally
```

## Next Steps

Once your documentation is live:

1. ✅ Add the link to your project README
2. ✅ Share with team members
3. ✅ Add to wiki page
4. ✅ Include in assessment submission

## Automatic Updates

Your documentation will automatically rebuild and redeploy when you:
- Push code changes to `main` branch
- Update JSDoc comments
- Modify any TypeScript files

No manual action needed - GitLab handles it automatically!

## Cost

GitLab Pages at Cardiff University is:
- ✅ **Free**
- ✅ **Unlimited bandwidth**
- ✅ **No storage limits**
- ✅ **Always available**

## Access Control

By default, GitLab Pages at Cardiff are **public**. Anyone with the URL can access.

If you need private documentation:
- Keep it in the repository only (don't use Pages)
- Set repository to private
- Share repository access with team members

---

**Questions?** Check [GITLAB_PAGES_SETUP.md](./GITLAB_PAGES_SETUP.md) for detailed troubleshooting.
