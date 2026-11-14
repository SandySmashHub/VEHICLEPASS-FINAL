# VehiclePass

Vehicle entry/exit management with authorised live GPS tracking, geofencing, overstay alerts, route history and reports.
MERN stack: React + Vite + Tailwind, Express, MongoDB Atlas (Mongoose), JWT, Socket.IO, Leaflet + OpenStreetMap.

## Features

| Area | What it does |
|---|---|
| Dashboard | Live counts from MongoDB: registered, inside, outside, active tracking, entries/exits today, overstay, open alerts. Live map, recent activity, recent alerts. Updates through Socket.IO. |
| Vehicles | CRUD (admin), search by number, filter by type and status, detail page with entry history and last GPS position. |
| Entry & exit | Captures GPS at the gate, blocks duplicate active entries (enforced by a MongoDB partial unique index), calculates parking duration. Unknown plates are registered on first entry. |
| Live tracking | Browser Geolocation API, explicit permission, shows lat/lng/accuracy/last update, Start/Stop tracking, periodic updates stored as history and broadcast to authorised sockets only. |
| Live map | Leaflet + OSM, status-coloured markers with registration labels, popups, search and select, nearby search with radius, your own location, geofence outlines. |
| Geofencing | Admin draws a polygon on the map. Boundary crossings create events and alerts (point-in-polygon, ray casting). |
| Route history | Pick vehicle + date range; polyline, start/end markers, entry/exit markers, timestamps, point count. Empty ranges show nothing rather than invented data. |
| Overstay alerts | Admin-configurable limit, background check every minute, one alert per parking session, admin can resolve. |
| Reports | Entries, exits, movement, overstay, vehicle-wise; date filters; CSV export (formula-injection safe). |
| Auth | Admin and Security Guard roles, bcrypt, JWT, protected routes and middleware, rate-limited login. |

## Roles

| Capability | Admin | Security guard |
|---|---|---|
| Dashboard, live map, nearby, route history, alerts (view), vehicles (view) | yes | yes |
| Record entry / exit, start / stop tracking | yes | yes |
| Add / edit / delete vehicles | yes | no |
| Create / edit / delete geofences, resolve alerts, change settings | yes | no |
| Users, reports | yes | no |

## Project structure

```
VehiclePass/
  client/   React app (Vite, Tailwind)  -> deploy to Vercel
  server/   Express API + Socket.IO     -> deploy to Render
  render.yaml, README.md, .gitignore
```

Server: `config/ controllers/ models/ routes/ middleware/ services/ socket/ utils/ scripts/ server.js`
Client: `src/components pages layouts context hooks services utils`

## Local setup

Requirements: Node.js 18+, a MongoDB Atlas cluster.

### 1. MongoDB Atlas
1. Create a free cluster, then a database user (Database Access).
2. Network Access: add your current IP (use `0.0.0.0/0` only if you accept the risk, e.g. for Render's free tier).
3. Connect > Drivers > copy the `mongodb+srv://...` string. URL-encode special characters in the password.

### 2. Backend
```bash
cd server
npm install
cp .env.example .env        # then edit .env
npm run seed:admin          # creates the first admin from ADMIN_* values
npm run seed:demo           # optional: simulated demo data
npm run dev                 # http://localhost:5000
```

### 3. Frontend
```bash
cd client
npm install
cp .env.example .env        # VITE_API_URL=http://localhost:5000
npm run dev                 # http://localhost:5173
```
Sign in with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` you put in `server/.env`. Create guard accounts in **Users**.

## Environment variables

**server/.env**

| Name | Purpose |
|---|---|
| `MONGODB_URI` | Atlas connection string (required) |
| `JWT_SECRET` | 32+ random characters (required) |
| `JWT_EXPIRES_IN` | Token lifetime, default `8h` |
| `CLIENT_URL` | Allowed browser origin(s) for CORS and Socket.IO, comma separated, no trailing slash |
| `PORT` | Default `5000` (Render sets it) |
| `DEFAULT_MAX_PARKING_MINUTES` | Initial overstay limit (changeable in Settings) |
| `TRACKING_STALE_MINUTES` | A real-GPS vehicle with no update for this long stops showing as tracked (default 5) |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Used only by `npm run seed:admin` |
| `DEMO_CENTER_LAT`, `DEMO_CENTER_LNG` | Centre of the demo geofence and vehicles |

**client/.env**: `VITE_API_URL` is the backend origin without `/api` (Socket.IO uses the same origin).

## Demo data

```bash
npm run seed:demo         # in server/
npm run seed:demo:clean   # removes demo data only
```
- Loads 18 vehicles of mixed types, completed and active entries, a demo geofence, sample alerts (overstay and geofence exit) and a GPS trail for 4 vehicles.
- Every demo document has `isDemo: true`. Demo GPS points are stored with `source: "SIMULATED"` and the UI shows **Simulated demo data** badges on them. They are never presented as live GPS.
- Re-running replaces earlier demo data, so it never creates duplicates, and it never touches records you created. Plates that already belong to real vehicles are skipped.
- Demo vehicles marked as tracked are exempt from the "stale tracking" expiry so the map is not empty. Run `seed:demo:clean` before real use.
- The seed does not create guard accounts with known passwords. Create them in the app.

## How GPS tracking works (and what it cannot do)

1. A signed-in user opens **Live map > Track**, chooses the vehicle that device is travelling in and presses **Start tracking**. The browser asks for location permission.
2. While the page stays open the app reads a fresh position every 10 seconds and posts it to `POST /api/tracking/location`. Positions with accuracy worse than 500 m are not sent.
3. The server validates coordinates, stores a `LocationHistory` record, updates the vehicle, checks geofences and emits `vehicle:location` to the authorised Socket.IO room.
4. **Tracking stops when the browser tab is closed, the phone locks or sleeps, or permission is revoked.** There is no background tracking. After `TRACKING_STALE_MINUTES` without updates the vehicle leaves the live map.
5. Browsers only provide location on HTTPS (localhost is exempt). Vercel and Render both serve HTTPS.

Every API route except `/health` and `/api/auth/login` needs a valid JWT. Socket.IO connections are rejected without a valid JWT, and location events go only to authenticated users.

## API overview (all under `/api`, JWT required unless noted)

| Method | Path | Role |
|---|---|---|
| POST | `/auth/login` (public), GET `/auth/me` | all |
| GET | `/dashboard?tzOffset=` | all |
| GET | `/vehicles`, `/vehicles/:id` | all |
| POST / PUT / DELETE | `/vehicles`, `/vehicles/:id` | admin |
| GET | `/entries?status=&search=&from=&to=&page=` | all |
| POST | `/entries/entry`, `/entries/exit` | all |
| POST | `/tracking/location`, `/tracking/stop` | all |
| GET | `/tracking/live`, `/tracking/nearby?lat=&lng=&radiusKm=`, `/tracking/history?vehicleId=&from=&to=` | all |
| GET | `/geofences`, `/geofences/events` | all |
| POST / PUT / DELETE | `/geofences`, `/geofences/:id` | admin |
| GET | `/alerts?resolved=&type=` | all |
| PATCH | `/alerts/:id/resolve` | admin |
| GET / PUT | `/settings` (PUT admin) | all / admin |
| GET | `/reports/:type?from=&to=&vehicleId=&format=csv` (entries, exits, movement, overstay, vehicle) | admin |
| CRUD | `/users` | admin |
| GET | `/health` (public) | |

Socket events (server to client): `vehicle:location`, `vehicle:status`, `tracking:stopped`, `alert:new`, `alert:resolved`.

## Deployment

### Backend on Render
1. Push the repository to GitHub (secrets are git-ignored; commit only `.env.example`).
2. Render > New > Web Service > connect the repo.
   - Root Directory: `server`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Health Check Path: `/health`
   - Or use **New > Blueprint** with the included `render.yaml`.
3. Environment variables: `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `CLIENT_URL` (your Vercel URL, e.g. `https://vehiclepass.vercel.app`).
4. In Atlas Network Access allow Render's outbound IPs (or `0.0.0.0/0` on the free tier).
5. Create the admin once, from your own machine, using the same `MONGODB_URI`: `cd server && npm run seed:admin`.
   Optional demo data: `npm run seed:demo`.
6. Note the service URL, e.g. `https://vehiclepass-api.onrender.com`. Free instances sleep after inactivity, so the first request can take about a minute.

### Frontend on Vercel
1. Vercel > Add New > Project > import the repo.
   - Root Directory: `client`
   - Framework: Vite, Build Command `npm run build`, Output Directory `dist`
2. Environment variable: `VITE_API_URL=https://vehiclepass-api.onrender.com`
3. Deploy. `client/vercel.json` rewrites all paths to `index.html` so deep links work.
4. Go back to Render and make sure `CLIENT_URL` exactly matches the Vercel origin (add preview or custom domains comma separated), then redeploy the API.

## Security notes
- Secrets only in environment variables; `.env` files are git-ignored.
- Passwords hashed with bcrypt (cost 12). Login is rate limited (20 per 15 minutes per IP). Location updates are rate limited.
- Inputs validated with Zod on every write; coordinates range-checked; Mongo regex input escaped; helmet; JSON body limit; CORS restricted to `CLIENT_URL`.
- The JWT is kept in `localStorage`, which is simple but readable by any script on the page. Keep dependencies updated and avoid adding untrusted scripts. For stricter setups move the token to an httpOnly cookie.
- Overstay and geofence checks run inside the API process (every minute). If you run several API instances, the unique indexes keep alerts from duplicating.
- Nearby search computes haversine distances in the API over currently tracked vehicles. That suits fleets of hundreds; use MongoDB `2dsphere` queries for much larger fleets.

## Tests

```bash
cd server
npm install
npm test
```
Unit tests cover the geofence maths (point-in-polygon, haversine), CSV escaping and formula-injection protection, date-range and timezone handling, and request validation (plates, GPS ranges, geofence size, nearby query). They need no database.

## Troubleshooting
- **CORS error in the browser**: `CLIENT_URL` on the server must equal the page origin exactly (scheme, host, no trailing slash).
- **Socket not connecting**: check `VITE_API_URL` and that you are signed in; the browser console shows `Unauthorized` for bad tokens.
- **"Location permission was denied"**: allow location for the site in browser settings, then retry. On HTTP (non-localhost) browsers block geolocation.
- **bcrypt install problems on a host**: use Node 18 or 20 LTS.
