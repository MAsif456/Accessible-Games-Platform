## Accessible Games Website
A full‑stack, React + Express application for discovering, reviewing, and reporting accessible games, with admin workflows for moderation.

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

## Learning recources for new developers (Link to wiki)
https://git.cardiff.ac.uk/c23049129/accessible-games-website/-/wikis/Learning-Resources

## Documentation/Websites of the frameworks, languages and libraries used (Link to wiki)
https://git.cardiff.ac.uk/c23049129/accessible-games-website/-/wikis/Technologies-Used---Documentation-&-Reasons

## Authors

###### Mohammad Asif (c23042139)

###### Suliman Salih (c23049129)

