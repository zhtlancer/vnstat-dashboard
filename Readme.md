<div align="center">
  <img src="https://raw.githubusercontent.com/Kshitiz-b/vnstat-dashboard/refs/heads/main/preview/logo.png" alt="Logo" width=500px>
</div>

# VNStat Dashboard

A sleek, responsive, containerized web dashboard to visualize network interface statistics using [`vnstat`](https://github.com/vergoh/vnstat).

---

## ✨ Features

- Real-time traffic display from `vnstat`
- Graphs for Hourly, Daily, Monthly, Yearly usage
- Responsive, dark-mode friendly UI
- Dockerized for portability
- Uses a single container for backend + frontend
- **Automatic Interface Detection** – reads the interfaces recorded in the vnStat database, no hardcoded `eth0`, `wlan0` etc.
- Custom interface filtering via environment variables
- Works on ARM (Raspberry Pi) and x86 systems

---

## 📦 Technologies Used

- **Frontend**: React + TailwindCSS + Recharts
- **Backend**: Node.js + Express
- **System**: vnStat CLI
- **Containerization**: Docker (multi-stage Alpine build)

---

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Kshitiz-b/vnstat-dashboard.git
cd vnstat-dashboard
```

### 2. Build Docker Image

```bash
docker build -t vnstat-dashboard .
```

### 3. Run the Container

The container only needs read access to the host's vnStat database. It does not need `--privileged` or host networking, and runs as an unprivileged user:

```bash
docker run -d \
  --name vnstat-dashboard \
  -p 8050:8050 \
  -v /var/lib/vnstat:/var/lib/vnstat:ro \
  --read-only --tmpfs /tmp \
  --cap-drop ALL \
  --security-opt no-new-privileges:true \
  vnstat-dashboard
```

To keep the dashboard reachable from this machine only, publish the port as `-p 127.0.0.1:8050:8050`.

### 4. Access the Dashboard

Open your browser and navigate to:

```
http://localhost:8050
```

---

## 🐳 Using Docker Compose

A ready-to-use `docker-compose.yml` is included:

```yaml
services:
  vnstat-dashboard:
    build: .
    image: vnstat-dashboard:latest
    ports:
      - "8050:8050"
    env_file:
      - path: .env.auth   # optional, see "Authentication" below
        required: false
    volumes:
      - /var/lib/vnstat:/var/lib/vnstat:ro
    read_only: true
    tmpfs:
      - /tmp
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    restart: unless-stopped
```

Run with:

```bash
docker compose up -d --build
```

---

## 🧭 Environment Variables

| Variable | Description | Default |
|-----------|--------------|----------|
| `PORT` | Port the app listens on | `8050` |
| `FRONTEND_DIR` | Path to built frontend | `frontend-build` |
| `ALLOWED_PREFIXES` | Comma-separated list of allowed interface prefixes | `eth,enp,wlan,wlp,tailscale,docker` |
| `ALLOWED_INTERFACES` | Explicit interface names (overrides prefix detection) | *(none)* |
| `AUTH_USER` | Username for HTTP Basic auth | *(none, auth disabled)* |
| `AUTH_PASSWORD_HASH` | scrypt hash of the password, `scrypt:<salt>:<hash>` | *(none, auth disabled)* |

---

## 🔒 Authentication

The dashboard can require a username and password (HTTP Basic auth). It is disabled unless both `AUTH_USER` and `AUTH_PASSWORD_HASH` are set; if only one is set, or the hash is malformed, the server refuses to start instead of running unprotected. `/healthz` stays open for health checks.

1. Generate the password hash (the password is read without echo and never stored):

   ```bash
   docker run --rm -it vnstat-dashboard node hash-password.js
   ```

2. Put the result into `.env.auth` next to `docker-compose.yaml` and restrict its permissions:

   ```bash
   cat > .env.auth <<'EOF'
   AUTH_USER=admin
   AUTH_PASSWORD_HASH=scrypt:...:...
   EOF
   chmod 600 .env.auth
   ```

3. Recreate the container: `docker compose up -d --force-recreate`.

Basic auth sends the password with every request, only Base64-encoded. Over plain HTTP anyone on the same network can read it, so access the dashboard over an encrypted channel (HTTPS reverse proxy, VPN such as Tailscale/WireGuard, or an SSH tunnel) when the network is not trusted.

---

## 🖼️ Screenshots

![Dashboard Preview](https://raw.githubusercontent.com/Kshitiz-b/vnstat-dashboard/refs/heads/main/preview/home.png)
![Hourly Dashboard Preview](https://raw.githubusercontent.com/Kshitiz-b/vnstat-dashboard/refs/heads/main/preview/hourly.png)
![Daily Dashboard Preview](https://raw.githubusercontent.com/Kshitiz-b/vnstat-dashboard/refs/heads/main/preview/daily.png)
![Monthly Dashboard Preview](https://raw.githubusercontent.com/Kshitiz-b/vnstat-dashboard/refs/heads/main/preview/monthly.png)
![Yearly Dashboard Preview](https://raw.githubusercontent.com/Kshitiz-b/vnstat-dashboard/refs/heads/main/preview/yearly.png)

---

## 🔧 Requirements

- Docker installed
- `vnstat` installed and daemon running on host (`sudo apt install vnstat`)
- Raspberry Pi or any ARMv8/AMD64 compatible Linux device

---

## 🐳 Ports & API

- **Frontend + API served on same port**: `8050`
- Backend API Endpoints:
  - `/api/interfaces` → List of available interfaces
  - `/api/vnstat/:interface` → Detailed JSON data for that interface

---

## 🧩 Directory Structure

```
.
├── backend/
│   └── server.js
├── frontend/
│   ├── public/
│   └── src/
├── preview/
├── docker-compose.yml
├── Dockerfile
└── README.md
```

---

## 📛 Customization

- Configure detection rules in `backend/server.js`
- Change UI/theme in `frontend/src/App.js` or TailwindCSS

---

## 📝 License

MIT © [Kshitiz](https://github.com/Kshitiz-b)