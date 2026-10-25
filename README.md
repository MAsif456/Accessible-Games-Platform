## PlayAble: Accessible Games Platform

A Steam-style website that lists only games accessible to people with
motor, dexterity and other disabilities, so the community can find
games they can actually play. Each game appears as a card with its
accessibility tags and categories. Clicking a card opens a full game
page with all the key information, which disabilities the game suits
and its specific accessibility features, and a link to the game's store
page, since the platform does not sell games itself. Users can read and
post reviews and report reviews or games, and admins review and
resolve those reports in an admin panel.

*Commits in this project appear under my former university username,
MASAsif.*

**Team:** 4 | **Tech:** MERN stack (MongoDB, Express, React, Node.js),
TypeScript, Jest, TypeDoc, GitLab CI/CD

## My contribution

This was a team project. My work covered accessibility, the game pages,
the review and reporting features, testing, and the deployment
pipeline.

### Accessibility
- Implemented global keyboard navigation across the whole website,
  including a skip link, so users with dexterity impairments can use the
  platform fully by keyboard.
- Added specific accessibility tags and categories for each game, and
  the accessibility features shown on every game's details page.

### Features
- Built the individual game information pages: clicking a game card
  opens the full details of the game, including which disabilities it
  suits and its specific accessibility features, with a link to the
  game's store page.
- Built the review system: users can post reviews and report reviews,
  and both are saved to the database.
- Built the general reports management feature: user reports go to the
  admin panel, where an admin can reply and resolve them, and resolved
  reports move to a resolved section.
- Built the game reports management feature, with separate Reported
  Games and Resolved Reported Games sections for admins.
- Improved the UI and CSS of the game details page.

### Testing and quality
- Set up Jest for the project and wrote the tests for keyboard
  navigation, general reports management and game reports management.
- Added tests to raise code coverage in files that were weakly covered.
- Added JSDoc comments to the relevant files.

### DevOps and documentation
- Set up the CI/CD pipeline (.gitlab-ci.yml) for backend and frontend
  deployment.
- Generated TypeDoc documentation for the client and server and
  configured the pipeline to host it on GitLab Pages.
- Fixed the repository structure, resolved merge conflicts, and kept
  the README up to date.

## Features
- Game catalogue with search, sorting, filters (genres, accessibility tags) and pagination  
- User auth, game favourites, recently viewed, and accessibility settings  
- User reviews with likes, reporting, and admin replies/deletion  
- Admin dashboards for reviews, reports (game/review), and game management  
- Secure middleware: JWT auth, CSRF protection, security headers, rate limiting  
- Comprehensive automated tests (frontend Jest/RTL, backend Jest)  


## Quick start

### Prerequisites
- Node.js  
- npm  

### Installation

```
# Clone repository
git clone <repo-url>  
cd accessible-games-website  

# Install server deps
cd PlayAble/server  
npm install  

# Install client deps
cd ../client  
npm install  
```

## Usage
### User features:  

- **Create account / sign in**: use the "Sign In" / “Register" links in the navbar.  

- **Browse games**: go to Browse, search/filter by genre or accessibility, paginate through results.  

- **Game details**: click a game card to view details, accessibility info, and reviews.  

- **Add a review**: on a game’s details page, sign in, then submit a review; you can like/unlike reviews.  

- **Report a game**: from the game page, open “Report” and submit a game issue.  

- **Report a review**: from the game page’s reviews list, choose “Report” on a specific review.  

- **General report**: use the “Report anything to us here” link/footer.  

- **Favourites / Recently viewed**: add/remove favourites on cards; your recently viewed games list updates automatically.  

### Admin features:  

- **Login email**= "admin@playable.com", login password= "admin123".

- **Reviews Management**: view/reply/delete reviews; resolve reported reviews (keep/delete) and add admin replies.  

- **Reports**: handle general and game reports (reply/resolve).  

- **Games Management**: view catalogue stats, search/paginate games, add/edit/delete games.  


## Development
### Testing
```
# Backend  
cd PlayAble/server  
npm test            # Jest + ts-jest  
npm test -- --coverage  

# Frontend  
cd PlayAble/client  
npm test            # Jest + React Testing Library  
npm test -- --runInBand   # for stable CI runs  
```

### Project Structure
```
PlayAble/
├── client/                     # React frontend
│   ├── node_modules/
│   ├── public/
│   ├── src/
│   │   ├── __tests__/          # Frontend test suite
│   │   ├── assets/
│   │   ├── components/
│   │   ├── context/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── styles/
│   │   └── utils/
│   ├── tests/                  # Additional test directory (if used)
│   └── ...                     # Configs (vite, tsconfig, jest) kept but not shown here
│
└── server/                     # Express backend
    ├── data/                   # Seed data / JSON assets
    ├── middleware/             # Custom Express middleware (security, auth, rate limit)
    ├── node_modules/
    ├── public/                 # Static assets (images, etc)
    ├── src/
    │   ├── __tests__/          # Backend Jest tests
    │   ├── config/             # Config helpers (db, env, secrets)
    │   ├── controllers/        # Route controllers
    │   ├── middleware/         # Request middleware (security, auth, CSRf)
    │   ├── models/             # Mongoose schemas
    │   ├── repositories/       # Database access layer
    │   ├── routes/             # Express routing layer
    │   ├── services/           # Business logic services
    │   └── utils/              # Shared utility functions
    └── ...                     # Package.json, tsconfig, env, Jest config, etc.
```


## Technology Stack

```
Backend: Node.js / Express (TypeScript), Mongoose
Database: MongoDB
Frontend: React 18 (TypeScript), Vite
Testing: Jest framework (frontend and backend) with GitLab CI/CD
```


## CI/CD Pipeline

Automated testing and deployment run on merge requests to the `main` branch:

- Frontend build verification (Vite + TypeScript)

- Backend unit tests (Jest)

- Automatic repository mirroring to GitHub for Render deployment

All quality gates must pass before merge approval.

## Deployment

### Database Configuration

MongoDB Atlas is used for production with secure connection handling, while local MongoDB is available as a development fallback.

### Deploying on Render

The project is deployed using Render, with separate services for the frontend and backend.

### Frontend Deployment

The React client is deployed as a Static Site.
Render automatically runs:

```
npm install
npm run build

```


The built files are served from the dist/ directory.

Live Frontend URL:
https://playable-frontend.onrender.com


### Backend Deployment

The Express server is deployed as a Web Service using the Node environment.

Render automatically performs:

```
npm install
npm run build
npm start

```

Environment variables such as `MONGODB_URI`, `FRONTEND_URL`, and `COOKIE_SECRET` are configured in the Render Dashboard.

Live Backend API URL:
https://playable-backend-no79.onrender.com


### Automatic Deployments

Whenever changes are pushed to the main branch on GitLab, Render automatically redeploys both services, ensuring the latest version is always live.

When first loading the site, it may take 10-30 seconds for the site to wake up, due to 15 minutes of inactivity. With Render Free Tier, this is one limitation.

## Contributing

1. Create feature branch from `main`
2. Implement changes with tests
3. Ensure CI/CD pass
4. Submit merge request to `main`
5. Once code reviewed, merge feature branch into `main`

## Documentation

The project documentation is automatically generated using TypeDoc and deployed via GitLab Pages on every push to the `main` branch.

### Client Documentation

https://nathans-project-3358e9.gitpages.cardiff.ac.uk/client/

### Server Documentation

https://nathans-project-3358e9.gitpages.cardiff.ac.uk/server/

Both documentation sites provide:

- Full API documentation

- Component and service descriptions

- Types and interfaces

- Project structure and architecture references

## Learning resources for new developers (Wiki)
https://git.cardiff.ac.uk/c23049129/accessible-games-website/-/wikis/Learning-Resources

## Documentation/Websites of the frameworks, languages and libraries used (Wiki)
https://git.cardiff.ac.uk/c23049129/accessible-games-website/-/wikis/Technologies-Used---Documentation-&-Reasons

## If you would like more specific setup instructions, visit this page (Wiki)
https://git.cardiff.ac.uk/c23049129/accessible-games-website/-/wikis/Step-by-Step-Guide:-Creating-PlayAble

## Other wikis

- C4 Diagrams https://git.cardiff.ac.uk/c23049129/accessible-games-website/-/wikis/C4-Diagrams
- Onboarding a new developer https://git.cardiff.ac.uk/c23049129/accessible-games-website/-/wikis/New-Developer-
- Chosen Tech Stack  https://git.cardiff.ac.uk/c23049129/accessible-games-website/-/wikis/chosen-tech-stack
- Working Agreement https://git.cardiff.ac.uk/c23049129/accessible-games-website/-/wikis/Working-Agreement
- Git workflow https://git.cardiff.ac.uk/c23049129/accessible-games-website/-/wikis/Our-Git-Workflow

## Authors

###### Mohammad Asif (c23042139)

###### Suliman Salih (c23049129)

**Version**: v1.0.0 - Core functionality complete.
