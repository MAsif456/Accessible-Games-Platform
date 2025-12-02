# GitLab Pages Setup Guide

This guide will help you deploy your documentation to GitLab Pages so it's accessible via a public URL.

## Quick Setup Steps

### 1. Commit Documentation Files to Git

First, ensure your documentation is committed to the repository:

```bash
cd PlayAble
git add .
git commit -m "Add automated documentation system with GitLab Pages support"
git push origin main
```

### 2. Enable GitLab Pages

The `.gitlab-ci.yml` file has already been created and will automatically:
- Build documentation on every push to `main`/`master` branch
- Deploy to GitLab Pages

### 3. Access Your Documentation URL

After pushing, GitLab will automatically build and deploy. Your documentation will be available at:

```
https://<your-username>.pages.cardiff.ac.uk/<project-name>/
```

For example:
```
https://c23049129.pages.cardiff.ac.uk/accessible-games-website/
```

### 4. Check Build Status

1. Go to your GitLab project
2. Navigate to **CI/CD** → **Pipelines**
3. Wait for the pipeline to complete (should take 2-3 minutes)
4. Click on **Settings** → **Pages** to see your live URL

### 5. Add Link to Wiki

Once deployed, add this to your GitLab wiki:

```markdown
## 📚 Documentation

Complete API and component documentation is available at:
[https://<your-username>.pages.cardiff.ac.uk/<project-name>/](https://<your-username>.pages.cardiff.ac.uk/<project-name>/)

### Documentation Sections:
- [Client Documentation](https://<your-username>.pages.cardiff.ac.uk/<project-name>/client/) - React components, hooks, services
- [Server Documentation](https://<your-username>.pages.cardiff.ac.uk/<project-name>/server/) - API endpoints, middleware, controllers
```

## Alternative Options

### Option 2: GitHub Pages (if you mirror to GitHub)

If you also use GitHub, you can deploy there:

1. Push your code to GitHub
2. Go to **Settings** → **Pages**
3. Set source to `main` branch and `/docs` folder
4. GitHub will give you a URL like: `https://<username>.github.io/<repo-name>/`

### Option 3: Host Locally and Share ZIP

If you don't want to use online hosting:

1. Generate documentation:
   ```bash
   npm run docs
   ```

2. Create a ZIP file:
   ```bash
   # Windows PowerShell
   Compress-Archive -Path PlayAble/docs/* -DestinationPath documentation.zip
   ```

3. Upload ZIP to GitLab:
   - Go to your project
   - **Repository** → **Files** → **Upload file**
   - Upload `documentation.zip`

4. Add to wiki:
   ```markdown
   Download documentation: [documentation.zip](./documentation.zip)
   Extract and open `index.html` in your browser.
   ```

### Option 4: Use Cardiff University Web Space

If you have Cardiff University web space:

1. Generate documentation
2. Upload `docs/` folder via FTP/SFTP to your university web space
3. Access via your personal Cardiff URL

## Troubleshooting

### Pipeline Fails
- Check **CI/CD** → **Pipelines** for error messages
- Ensure `package.json` has correct dependencies
- Verify Node.js version in `.gitlab-ci.yml` (currently set to Node 18)

### Pages Not Showing
- Go to **Settings** → **Pages** in GitLab
- Ensure Pages is enabled for your project
- Check that the pipeline completed successfully
- Pages may take 5-10 minutes to deploy after first push

### Wrong URL Structure
- Ensure your `.gitlab-ci.yml` copies files to `public/` directory
- The `pages` job must create a `public/` folder with an `index.html`

## Updating Documentation

Every time you push to the main branch, GitLab will automatically:
1. Run `npm run docs` to regenerate documentation
2. Deploy the updated docs to GitLab Pages

To manually update without waiting for a push:
1. Go to **CI/CD** → **Pipelines**
2. Click **Run Pipeline**
3. Select `main` branch
4. Click **Run Pipeline**

## Configuration Files

### `.gitlab-ci.yml`
This file tells GitLab how to build and deploy your documentation. It:
- Uses Node.js 18 image
- Installs dependencies
- Runs `npm run docs`
- Publishes to the `public/` directory (required by GitLab Pages)

### `.gitignore`
Documentation is now **included** in git (commented out the exclusion) so GitLab CI can deploy it.

If you prefer to exclude docs from git and only build via CI:
1. Uncomment the `docs/` line in `.gitignore`
2. The CI pipeline will still generate docs during build

## Security Notes

GitLab Pages at Cardiff:
- **Public by default** - Anyone with the URL can access
- No authentication required
- Suitable for documentation, not sensitive data

If you need to restrict access:
1. Keep documentation in repository only
2. Don't use GitLab Pages
3. Share repository access with team members only

## Next Steps

1. **Commit and push** the `.gitlab-ci.yml` file
2. **Wait for pipeline** to complete
3. **Get your URL** from GitLab Settings → Pages
4. **Update wiki** with the documentation link
5. **Share** with your team!

---

**Generated**: 2nd December 2025
**For**: PlayAble Documentation System
