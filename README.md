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

### Detailed Setup instructions



## Usage
User features:  
- Create account / sign in: use the “Sign In” / “Register” links in the navbar.  
- Browse games: go to Browse, search/filter by genre or accessibility, paginate through results.  
- Game details: click a game card to view details, accessibility info, and reviews.  
- Add a review: on a game’s details page, sign in, then submit a review; you can like/unlike reviews.  
- Report a game: from the game page, open “Report” and submit a game issue.  
- Report a review: from the game page’s reviews list, choose “Report” on a specific review.  
- General report: use the “Report anything to us here” link/footer.  
- Favourites / Recently viewed: add/remove favourites on cards; your recently viewed games list updates automatically.  
Admin features:  
- login email= "admin@playable.com", login password= "admin123".
- Reviews Management: view/reply/delete reviews; resolve reported reviews (keep/delete) and add admin replies.  
- Reports: handle general and game reports (reply/resolve).  
- Games Management: view catalogue stats, search/paginate games, add/edit/delete games.  


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

## Technology Stack

```
Backend: Node.js / Express (TypeScript), Mongoose
Database: MongoDB
Frontend: React 18 (TypeScript), Vite
Testing: Jest framework (frontend and backend) with GitLab CI/CD
```


## CI/CD Pipeline

## Deployment

### Database Configuration

### Production Setup

## Contributing

## Learning recources for new developers (Link to wiki)
https://git.cardiff.ac.uk/c23049129/accessible-games-website/-/wikis/Learning-Resources

## Documentation/Websites of the frameworks, languages and libraries used (Link to wiki)
https://git.cardiff.ac.uk/c23049129/accessible-games-website/-/wikis/Technologies-Used---Documentation-&-Reasons

## Author

