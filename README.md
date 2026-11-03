# ProjectHub

ProjectHub is a student-project showcase built with React and Vite, an
Express API, and MongoDB Atlas. Students can submit projects and track their
review status; institutions review projects; administrators manage
institution registrations; and approved projects appear in the public gallery.

## Demo

- [Watch or download the ProjectHub demo video](https://github.com/soumadip-003/ProjectHub-Showcase-your-projects-in-modern-way/raw/refs/heads/main/ProjectHub-demo.mp4)
- [English subtitles](ProjectHub-demo.srt)

The walkthrough uses fictional sample records and does not show live account
or database activity.

## Requirements

- Node.js 20.19+ or 22.12+
- npm
- A MongoDB Atlas cluster and database user

## Set up the backend

1. Copy `server/.env.example` to `server/.env`.
2. Set `MONGODB_URI` to your MongoDB Atlas connection string and replace every
   placeholder with your own private value.
3. Add your current public IP address to the Atlas project's **Network Access**
   IP access list. Do not use `0.0.0.0/0` for a normal development setup.
4. From the project root, install the backend dependencies and start the API:

   ```sh
   npm ci
   node server/server.js
   ```

The API starts at `http://localhost:5000` after it connects to MongoDB.
Check the connection at `http://localhost:5000/api/health`.

## Set up the frontend

In a second terminal:

```sh
cd client
npm ci
npm run dev
```

Open the Vite URL printed in the terminal (normally `http://localhost:5173`).
The frontend currently uses `http://localhost:5000/api` for backend requests.

## Admin credentials

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD_HASH` in `server/.env`. Generate the
bcrypt hash for your own admin password without putting the password in source
control:

```sh
node -e "require('bcryptjs').hash(process.argv[1], 12).then(console.log)" "your-private-password"
```

Use the printed hash as `ADMIN_PASSWORD_HASH`. Never commit the `.env` file,
database URI, admin password, password hash, or JWT secret.

## Project workflows

- Students register or sign in at `/student/signup` and `/student/login`.
- Student submissions are linked to the authenticated student account.
- Institutions sign in at `/institute/login` and review their projects.
- Administrators sign in at `/admin/login` and approve institution accounts.
- Only approved projects appear in the public gallery.

## Build and lint the frontend

```sh
cd client
npm run build
npm run lint
```
