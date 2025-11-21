# Step-by-Step Guide: Creating Playable

## Prerequisites
- Node.js (v18 or higher) installed
- npm or yarn package manager
- MongoDB installed locally OR MongoDB Atlas account (for cloud database)

---

## Step 1: Install Frontend Dependencies

Navigate to the client folder and install all required packages:

```bash
cd client
npm install
```

This will install:
- React and React DOM
- TypeScript
- Vite (build tool)
- All necessary type definitions

---

## Step 2: Install Backend Dependencies

Navigate to the server folder and install all required packages:

```bash
cd ../server
npm install
```

This will install:
- Express (web framework)
- Mongoose (MongoDB ODM)
- TypeScript
- CORS (for cross-origin requests)
- dotenv (for environment variables)
- ts-node-dev (for development with hot reload)

---

## Step 3: Create Environment File

Create a `.env` file in the server directory:

```bash
cd server
cp .env
```

Or manually create `server/.env` with:
```
PORT=5001
MONGODB_URI=mongodb+srv://<db_username>:<db_password>@cluster0.oyjk8lb.mongodb.net/playable_db?retryWrites=true&w=majority&appName=Cluster0
Replace <db_password> with the password for the <db_username> database user.
NODE_ENV=development
```

---

## Step 4: Configure MongoDB

### Option A: Local MongoDB
If you have MongoDB installed locally, make sure it's running:
```bash
# On macOS with Homebrew
brew services start mongodb-community

# Or start manually
mongod
```

The default connection string targets the `playabledb` database and is already set in `server/.env`:
```
MONGODB_URI=mongodb://localhost:27017/playabledb
```

### Option B: MongoDB Atlas (Cloud)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free cluster
3. Get your connection string
4. Update `server/.env` with your connection string and make sure it points at `playable_db`:


---

## Step 5: Start the Backend Server

In the server directory, run:

```bash
cd server
npm run dev
```

You should see:
- ✅ Connected to MongoDB (if MongoDB is running)
- Server is running on port 5001

The server will automatically restart when you make changes (thanks to ts-node-dev).

---

## Step 6: Start the Frontend Development Server

Open a **new terminal window** and navigate to the client directory:

```bash
cd client
npm run dev
```

You should see:
- Vite dev server running
- Local URL: http://localhost:3000

---

## Step 7: Verify Everything Works

1. **Frontend**: Open http://localhost:3000 in your browser
   - You should see the application itself

2. **Backend**: Open http://localhost:5000/api/health in your browser
   - You should see: `{"status":"OK","message":"Server is running"}`

---

## Creation of collections (playabledb)

- The backend automatically connects to the `playable_db` database.
- The Mongoose schema for the `users` collection lives in `server/src/models/user.ts`.
- When you create or save a user through that model, MongoDB will create the `users` collection if it doesn’t already exist.
- Update `server/.env` if you need to point to a different database name.
- It's the same process when creating any collection.

---

## Project Structure

```
.
├── client/                 # React Frontend
│   ├── src/
│   │   ├── App.tsx        # Main React component
│   │   ├── main.tsx       # Entry point
│   │   └── Styles
            └── index.css      # Styles
│   ├── index.html         # HTML template
│   ├── package.json       # Frontend dependencies
│   ├── tsconfig.json      # TypeScript config
│   └── vite.config.ts     # Vite configuration
│
├── server/                 # Express Backend
│   ├── src/
│   │   ├── models/
│   │   │   └── user.ts  # Users collection schema
│   │   └── server.ts      # Main server file
│   ├── package.json       # Backend dependencies
│   ├── tsconfig.json      # TypeScript config
│   └── .env               # Environment variables
│
└── SETUP_INSTRUCTIONS.md  # This file
```

---

## Available Scripts

### Frontend (client/)
- `npm run dev` - Start development server (port 3000)
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Backend (server/)
- `npm run dev` - Start development server with hot reload (port 5001)
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start production server (after building)

---

## Troubleshooting

### MongoDB Connection Issues
- Make sure MongoDB is running (if using local)
- Check your connection string in `server/.env`
- Verify network access if using MongoDB Atlas

### Port Already in Use
- Change the port in `server/.env` (PORT=5001) or `client/vite.config.ts` (port: 3001)

### TypeScript Errors
- Make sure all dependencies are installed
- Run `npm install` again if needed

---

## Next Steps

Now that your MERN stack is running, you can:
1. Add routes in `server/src/server.ts`
2. Create React components in `client/src/`
3. Add MongoDB models in `server/src/models/`
4. Build your application features!

---

## Quick Start Commands (Summary)

```bash
# Terminal 1 - Backend
cd server
npm install
npm run dev

# Terminal 2 - Frontend
cd client
npm install
npm run dev
```

Then open http://localhost:3000 in your browser!

