## Accessible Games Website
A full‑stack, React + Express application for discovering, reviewing, and reporting accessible games, with admin workflows for moderation.

## Features
Game catalogue with search, sorting, filters (genres, accessibility tags) and pagination  
User auth, game favourites, recently viewed, and accessibility settings  
User reviews with likes, reporting, and admin replies/deletion  
Admin dashboards for reviews, reports (game/review), and game management  
Secure middleware: JWT auth, CSRF protection, security headers, rate limiting  
Comprehensive automated tests (frontend Jest/RTL, backend Jest)  

## Quick start

### Prerequisites
Node.js  
npm  

### Installation

# Clone repository
git clone <repo-url>  
cd accessible-games-website  

# Install server deps
cd PlayAble/server  
npm install  

# Install client deps
cd ../client  
npm install  

## Usage

# Start backend (from PlayAble/server)
npm run dev    # or npm start for compiled build  

# Start frontend (from PlayAble/client)
npm run dev  

## Development
### Testing
Backend:  

cd PlayAble/server  
npm test            # Jest + ts-jest  
npm test -- --coverage  


Frontend:  

cd PlayAble/client  
npm test            # Jest + React Testing Library  
npm test -- --runInBand   # for stable CI runs  
### Project Structure

## Technology Stack

Frontend: React, TypeScript, Vite, Jest + React Testing Library  
Backend: Node.js/Express, TypeScript, Mongoose/MongoDB  

## CI/CD Pipeline

## Deployment

### Database Configuration

### Production Setup

## Contributing

## Author

