# Step-by-Step Guide: Creating PlayAble

## Prerequisites
- Node.js (v18 or higher) installed
- npm or yarn package manager
- MongoDB installed locally OR MongoDB Atlas account (for cloud database)
- Gmail account for sending password reset emails (see Email Setup below)

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
- bcryptjs (for password hashing)
- jsonwebtoken (for JWT authentication)
- nodemailer (for sending emails)

For TypeScript projects, also install type definitions:

```bash
npm install --save-dev @types/bcryptjs @types/jsonwebtoken
```

---

## Step 3: Create Environment File

Create a `.env` file in the server directory:

```bash
cd server
cp .env.example .env
```

Or manually create `server/.env` with:
```
PORT=5001
MONGODB_URI=mongodb+srv://<db_username>:<db_password>@cluster0.oyjk8lb.mongodb.net/playable_db?retryWrites=true&w=majority&appName=Cluster0
NODE_ENV=development
EMAIL_USER=playablehelp@gmail.com
EMAIL_PASS=wervjuybyknubdnx
```
- Replace `<db_password>` with the password for the `<db_username>` database user.

**Important:** You must use the following account details for PlayAble's email service:
```
EMAIL_USER=playablehelp@gmail.com
EMAIL_PASS=wervjuybyknubdnx
```
These credentials are required for password reset and notification features to work correctly.

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

2. **Backend**: Open http://localhost:5001/api/health in your browser
   - You should see: `{"status":"OK","message":"Server is running"}`

---

## Email Setup and Password Reset

- The backend uses Nodemailer and your Gmail account to send password reset codes.
- When a user requests a password reset, a one-time code is emailed to them.
- The user enters this code and a new password in the UI to complete the reset.
- For development, you can test email delivery using the `/api/test/test-email` endpoint.

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
│   │   ├── components/
│   │   │   └── ui/
│   │   │       └── Navbar.tsx, Footer.tsx
│   │   ├── context/
│   │   │   └── AuthContext.tsx
│   │   ├── pages/
│   │   │   └── SignInPage.tsx, BrowsePage.tsx, ...
│   │   ├── services/
│   │   │   └── authService.ts
│   │   └── styles/
│   │       └── index.css, SignIn.css
│   ├── index.html         # HTML template
│   ├── package.json       # Frontend dependencies
│   ├── tsconfig.json      # TypeScript config
│   └── vite.config.ts     # Vite configuration
│
├── server/                 # Express Backend
│   ├── src/
│   │   ├── server.ts      # Main server file (Express app setup)
│   │   └── models/
│   │       ├── index.ts   # Mongoose connection / model bootstrap
│   │       └── user.ts    # Users collection schema
│   ├── routes/
│   │   └── authRoutes.ts  # Authentication and password reset routes
│   ├── controllers/
│   │   └── authController.ts
│   ├── middleware/
│   │   └── auth.ts        # JWT auth middleware
│   ├── services/
│   │   └── emailService.ts # Nodemailer email helper (password reset)
│   ├── utils/             # Shared backend utilities (if any)
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
- If you see `EADDRINUSE`, stop the process using the port (Ctrl+C in terminal, or use Task Manager/PowerShell)

### TypeScript Errors
- Make sure all dependencies are installed
- Run `npm install` again if needed

### Email Issues
- Ensure your Gmail credentials and App Password are correct in `.env`
- Check spam folder for test/reset emails
- Use `/api/test/test-email` to verify email delivery

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

---

## Authentication & Account Management

### Sign Up, Sign In, and Log Out
- The app supports accessible Sign Up and Sign In forms with client-side validation for email and password fields.
- Error messages are screen-reader friendly and use clear, accessible language.
- The "Log Out" button is in the Navbar's My Account dropdown. Logging out prompts a confirmation dialog and redirects to the homepage.
- After successful sign up or sign in, forms are cleared and welcome/logged out prompts are shown.
- JWT tokens are used for authentication and are set to expire after 1 year.
- Error messages are screen-reader friendly and use clear, accessible language.
- The "Log Out" button is in the Navbar's My Account dropdown. Logging out prompts a confirmation dialog and redirects to the homepage.
- After successful sign up or sign in, forms are cleared and welcome/logged out prompts are shown.
- JWT tokens are used for authentication and are set to expire after 1 year.
- All sensitive fields (email, password) have browser autofill disabled for security.

### Password Reset Flow (via Email)
- Users can reset their password by requesting a one-time code sent to their email.
- The flow: Request reset → Check email (with timer and resend) → Enter code and new password → Confirmation.
- The backend uses Nodemailer with Gmail to send reset codes. See Email Setup below.
- All backend responses are JSON, including errors.

---

## Email Service Setup (Password Reset)

The backend uses Nodemailer to send password reset codes via Gmail. To enable this:

1. In your `server/.env`, add:
   ```
   EMAIL_USER=playablehelp@gmail.com
   EMAIL_PASS=wervjuybyknubdnx
   EMAIL_FROM=Playable Support <playablehelp@gmail.com>
   ```
2. The email service is configured in `server/services/emailService.ts`.
3. You can test email delivery with the `/api/email/test` endpoint (see `server/routes/emailTestRoutes.ts`).

---

## Accessibility & UI Improvements
- All authentication forms use accessible labels, ARIA attributes, and keyboard navigation.
- Error messages are announced to screen readers.
- Form layouts are optimised for clarity and usability.
- Accessible sign-in options (e.g., button labels, focus management) are included.

---

## Error Handling & API Responses
- The backend always returns JSON for both success and error responses.
- Global error and 404 handlers are implemented in Express.
- Frontend displays error messages in a user-friendly and accessible way.

---

## Troubleshooting (Authentication & Email)

### Email Not Sending (Password Reset)
- Check `EMAIL_USER` and `EMAIL_PASS` in `server/.env`.
- Make sure you are using the provided PlayAble email account details.
- Check your Gmail account for security alerts (sometimes Google blocks sign-in attempts).
- Try the `/api/email/test` endpoint to verify email delivery.

### Password Reset Issues
- Ensure the backend server is running and can access the email service.
- Check the server logs for errors related to Nodemailer or email delivery.
- Make sure the frontend is pointing to the correct API URL (uses `/api` proxy).

### General Authentication Issues
- If you see JSON error messages, check the error details for hints.
- Make sure MongoDB is running and accessible.
- If JWT tokens are not persisting, check browser cookie settings and expiry.

---

## Security Notes
- JWT tokens expire after 1 year for user convenience, but you can adjust this in the backend if needed.
- All sensitive data is transmitted over HTTPS in production (configure your deployment accordingly).
- Passwords are never sent via email—only one-time codes for reset.

---

## Architectural Notes
- All authentication logic is consolidated in `server/routes/authRoutes.ts` and `server/controllers/authController.ts`.
- Email logic is in `server/services/emailService.ts`.
- The frontend uses a central `AuthContext` for authentication state and logic.
- All API calls use `/api` as the base URL (Vite proxy).
- Comments in code focus on "why" decisions, accessibility, and maintainability.

---

