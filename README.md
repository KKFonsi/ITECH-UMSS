# University Maintenance Services System (UMSS)

A campus maintenance portal for the **Polytechnic University of the Philippines (PUP) General Services Office (GSO)**. Students can report broken items, scan classroom QR codes, book rooms, and request equipment, while GSO administrators and technicians manage the work-order pipeline.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, Tailwind CSS v4 |
| Backend | Node.js, Express 5, TypeScript |
| Validation | Zod |
| Logging | Pino |
| Database | PostgreSQL via pg + Supabase Auth |
| Deployment | Vercel (frontend + serverless API), Replit |

## Project Structure

```text
umss/
├── frontend/                  # React SPA (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   └── umss/
│   │   │       ├── UMSS.tsx       # Main UI (all screens)
│   │   │       └── mockData.ts    # Seed / mock data
│   │   ├── assets/
│   │   │   └── PUP_LOGO.png
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.ts
│   └── package.json
├── backend/                   # Express API
│   ├── src/
│   │   ├── routes/
│   │   │   ├── index.ts           # Route registration
│   │   │   └── health.ts          # GET /api/healthz
│   │   ├── lib/
│   │   │   └── logger.ts
│   │   ├── app.ts                 # Express app and middleware
│   │   └── index.ts               # Server entry / graceful shutdown
│   ├── build.mjs                  # esbuild production bundler
│   └── package.json
├── vercel.json                 # Vercel deployment configuration
├── .replit                     # Replit Agent configuration
├── .env.example                # Environment variable template
└── README.md
```

## Local Development

### Prerequisites

- Node.js 22 or later
- npm 10 or later

### 1. Clone and Install

Replace `<your-username>` with your GitHub username, and adjust the repository URL if necessary.

```bash
git clone https://github.com/<your-username>/umss.git
cd umss

# Install root development dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..

# Install backend dependencies
cd backend
npm install
cd ..
```

### 2. Configure Environment Variables

Copy the example environment file and update it with the required values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Set the backend database connection, database CA certificate, Supabase project URL and publishable key, and matching frontend public Auth settings. See [authentication setup and verification](docs/AUTH_INTEGRATION.md). On Windows PowerShell:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

### 3. Run Both Development Servers

From the project root:

```bash
npm run dev
```

| Service | Local URL |
| --- | --- |
| Frontend | http://localhost:5173 |
| Backend | http://localhost:3000 |

Alternatively, run the servers individually in separate terminals:

```bash
npm run dev:frontend
npm run dev:backend
```

## Deployment

### Vercel

1. Push the repository to GitHub.
2. Import the repository at [Vercel](https://vercel.com).
3. Use the included `vercel.json` deployment configuration for the frontend and API.
4. Configure the required environment variables in the Vercel dashboard, such as `DATABASE_URL` and `ALLOWED_ORIGINS` when applicable.
5. Deploy and verify that both the frontend and API endpoints work.

> **Note:** Verify the serverless API routing and build output before relying on the deployment for production use.

### Replit

1. Open [Replit](https://replit.com) and select **Import from GitHub**.
2. Paste the repository URL.
3. Configure any required secrets, including `PORT` and `DATABASE_URL` when applicable.
4. Use the included `.replit` configuration and click **Run**.

## Adding New API Routes

Create a route module, for example `backend/src/routes/workOrders.ts`:

```typescript
import { Router } from "express";

const router = Router();

router.get("/", (_req, res) => {
  res.json({ workOrders: [] });
});

export default router;
```

Then register it in `backend/src/routes/index.ts` within the existing route-registration setup:

```typescript
import workOrdersRouter from "./workOrders.js";

router.use("/work-orders", workOrdersRouter);
```

> The example returns an empty list. Connect it to the database when the persistence layer is implemented.

## Application Screens

The main application screens are currently defined in `frontend/src/components/umss/UMSS.tsx`.

| Screen | Role | Description |
| --- | --- | --- |
| `login` | All | Email/password sign-in with server-verified roles |
| `student-dashboard` | Student | Quick actions, submissions, and GSO access |
| `qr-review` | Student | Classroom QR scanning, ratings, and defect reports |
| `report-form` | Student | Maintenance reports by campus, location, and category |
| `technician-queue` | GSO Technician | Work-order queue and status updates |
| `admin-dashboard` | Admin | Work-order overview, reassignment, and audit log |
| `superadmin-dashboard` | Superadmin | System-wide statistics and user management |
| `campus-assistant` | Student | FAQ chatbot |
| `room-reservation` | Student | Study-room reservations |
| `equipment-request` | Student | Equipment borrowing and returns |
| `user-management` | Admin / Superadmin | Account activation and deactivation |

> **Current development status:** Supabase authentication and PostgreSQL work-order APIs are implemented. Remaining reservation, equipment, QR-review, directory and audit features are labelled demos. Live authentication, role authorization and persistence checks passed against the configured development project; see [integration verification](docs/AUTH_INTEGRATION.md).

## License

MIT
