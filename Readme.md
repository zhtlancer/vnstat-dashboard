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
- **Automatic Interface Detection** – no hardcoded `eth0`, `wlan0` etc.
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

Make sure to use `--privileged` so that `vnstat` inside the container can access system data:

```bash
docker run -d \
  --name vnstat-dashboard \
  --privileged \
  -p 8050:8050 \
  -v /var/lib/vnstat:/var/lib/vnstat:ro \
  kshitizb/vnstat-dashboard
```

### 4. Access the Dashboard

Open your browser and navigate to:

```
http://localhost:8050
```

---

## 🐳 Using Docker Compose

A ready-to-use `docker-compose.yml` is included:

```yaml
version: "3.9"
services:
  vnstat-dashboard:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: vnstat-dashboard
    privileged: true
    ports:
      - "8050:8050"
    environment:
      - NODE_ENV=production
      - FRONTEND_DIR=frontend-build
      - ALLOWED_PREFIXES=eth,enp,wlan,wlp,tailscale,docker
      # Optional explicit interfaces:
      # - ALLOWED_INTERFACES=eth0,wlan0,docker0
    volumes:
      - /var/lib/vnstat:/var/lib/vnstat:ro
    restart: unless-stopped
```

Run with:

```bash
docker compose up -d
```

---

## 🧭 Environment Variables

| Variable | Description | Default |
|-----------|--------------|----------|
| `PORT` | Port the app listens on | `8050` |
| `FRONTEND_DIR` | Path to built frontend | `frontend-build` |
| `ALLOWED_PREFIXES` | Comma-separated list of allowed interface prefixes | `eth,enp,wlan,wlp,tailscale,docker` |
| `ALLOWED_INTERFACES` | Explicit interface names (overrides prefix detection) | *(none)* |

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