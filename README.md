# 🗺️ Waymark — Privacy-First OSM Toolkit

**A Progressive Web App for exploring, learning, and contributing to OpenStreetMap.**

> No Cookies • No Tracking • No Ads • No Sponsors • Open Source • Privacy First • Minimal Design

## ✨ Features

### Core
- 🗺️ Interactive Leaflet map with 4 layers (Standard, Satellite, Cycle, Transport)
- 📱 Progressive Web App — install on home screen, works offline
- 🌐 Bilingual (English / Greek) with auto-detection
- 🌑 Dark mode (exclusive — no theme toggle, pure dark)
- 📴 Offline caching of map tiles via Service Worker

### Modules (all OFF by default — toggle to activate)

| Module | Description | API |
|--------|-------------|-----|
| 🔍 Address Search | Search any location worldwide | Nominatim (CORS ✅) |
| 📍 POI Viewer | Find cafes, pharmacies, bus stops, etc. | Overpass (CORS ✅) |
| 📤 OSM Editor | Create/edit POIs, upload via OAuth 2.0 PKCE, ✅ check_date confirm | Cloudflare Worker proxy |
| 🏃 Track Recorder | GPS track recording with live polyline, GPX export/upload | Geolocation API + OSM GPX API |
| 🏠 Building Editor | Draw building polygons, 8 presets, upload to OSM | Cloudflare Worker proxy |
| 🛣️ Road Editor | Draw roads vertex-by-vertex, 12 highway types, one-way support | Cloudflare Worker proxy |
| 🏘️ Address Mapper | Quick house number mapping with auto street detection | Overpass + Cloudflare Worker proxy |
| 🎯 Quest Mode | StreetComplete-style quests for missing OSM data | Overpass + Cloudflare Worker proxy |
| 📡 GPX Editor | Upload, view, and download GPX tracks | Client-side only |
| 📝 XML Generator | Create .osc files for manual OSM upload | Client-side only |
| ⚠️ Quality Checker | Find data quality issues in an area | Overpass (CORS ✅) |
| 🌡️ Density Heatmap | Visualize POI density | Overpass (CORS ✅) |
| 🏷️ Tags Reference | Built-in OSM tag lookup (works offline) | Static data |
| 📋 Notes Browser | View, create, and resolve OSM notes in the area | OSM API (CORS ✅) |
| 📖 Tutorial Mode | Interactive 15-step walkthrough | Client-side only |

## 🚀 Quick Start

### Option A: GitHub Pages (Recommended)

1. Fork this repository
2. Go to **Settings → Pages**
3. Select **main** branch as source
4. Site deployed at `https://<username>.github.io/waymark`

### Option B: Local Development

bash git clone https://github.com/koulaxizis/waymark.git cd waymark python3 -m http.server 8000


Open http://localhost:8000

## 🔧 Configuration

### 1. Edit `config.js`

javascript const WAYMARK_CONFIG = { OSM_CLIENT_ID: 'your_client_id', REDIRECT_URI: 'https://koulaxizis.github.io/waymark/callback.html', PROXY_URL: 'https://waymark-proxy.yourname.workers.dev', OAUTH_SCOPE: 'read_prefs write_api write_notes write_gpx', };


### 2. Register OAuth 2.0 App on OSM

1. Go to https://www.openstreetmap.org/oauth2/applications
2. Click "Register new application"
3. Fill in:
   - **Name**: Waymark
   - **Homepage URL**: `https://koulaxizis.github.io/waymark`
   - **Redirect URIs**: `https://koulaxizis.github.io/waymark/callback.html`
   - **Scopes**:
     - ✅ `read_prefs` — Read user preferences
     - ✅ `write_api` — Modify the map
     - ✅ `write_notes` — Modify notes (Notes Browser module)
     - ✅ `write_gpx` — Upload GPS traces (Track Recorder module)
4. Copy the **Client ID** into `config.js`

### 3. Deploy Cloudflare Worker (for write modules)

The OSM Editor, Building Editor, Road Editor, Address Mapper, and Quest Mode
require a CORS proxy because `api.openstreetmap.org` does not send CORS headers
for write operations.

**Steps:**

1. Create a free Cloudflare account at https://dash.cloudflare.com
2. Go to **Workers & Pages → Create Application → Create Worker**
3. Name it `waymark-proxy`
4. Paste the contents of `worker/osm-proxy.js` into the editor
5. Click **Save and Deploy**
6. Copy the Worker URL (e.g. `https://waymark-proxy.yourname.workers.dev`)
7. Paste it into `config.js` as `PROXY_URL`

**Cost: $0** — Free tier includes 100,000 requests/day.

### 4. Generate PWA Icons

Create two PNG icons:
- `icon-192.png` (192×192px)
- `icon-512.png` (512×512px)

Use any online icon generator or image editor. A simple purple (#6d4aff)
square with "W" in white works well.

## 📱 Install as PWA

1. Open Waymark in your mobile browser (Chrome, Safari, Firefox)
2. Tap the menu / Share button
3. Select "Add to Home Screen"
4. Launch from home screen — works like a native app

## 🔄 Offline Mode

- Map tiles viewed while online are cached automatically
- The app shell (HTML, CSS, JS) is cached on first visit
- Cached tiles work when offline — panning around visited areas
- API calls (Overpass, Nominatim) require internet connection
- All client-side modules (GPX Editor, XML Generator, Tags Reference,
  Tutorial) work fully offline

## 🔐 Privacy Guarantee

| What | Status |
|------|--------|
| Cookies | ❌ None |
| Tracking / Analytics | ❌ None |
| Advertising | ❌ None |
| Third-party scripts | ❌ None (only Leaflet CDN + tile servers) |
| Data storage | sessionStorage only (cleared on tab close) |
| Map tile requests | Sent directly to tile servers (no intermediary) |
| OSM API requests | Routed through your own Cloudflare Worker |
| OAuth tokens | Stored in sessionStorage, never persisted to disk |
| GPS tracks | Recorded locally, uploaded only on explicit user action |

All processing happens in your browser. Your data never leaves your device
unless you explicitly upload to OpenStreetMap.

## 🛠️ Tech Stack

- **Frontend**: Vanilla JavaScript (no frameworks)
- **Map**: Leaflet.js 1.9.4 (open source)
- **PWA**: Service Worker API, Web App Manifest
- **APIs**: OpenStreetMap API, Overpass API, Nominatim
- **Proxy**: Cloudflare Workers (free tier)
- **Hosting**: GitHub Pages (static)

## 🌍 Browser Compatibility

| Browser | Support |
|---------|---------|
| Chrome (Android/desktop) | ✅ Full (PWA, offline, all modules) |
| Firefox (Android/desktop) | ✅ Full (PWA, offline, all modules) |
| Safari (iOS 16.4+) | ✅ Full (PWA via Add to Home Screen) |
| Edge (desktop) | ✅ Full |
| Samsung Internet | ✅ Full |

## 📄 License

MIT License — feel free to modify, distribute, and contribute.

## 🤝 Contributing

Pull requests welcome! Areas that need help:
- Additional Overpass query templates for POI Viewer
- More tag categories in Tags Reference
- Translations (add your language to `i18n.js`)
- Bug reports and feature requests

## 🗺️ Roadmap

- [ ] Batch POI Import from CSV
- [ ] Route Planner (OSRM)
- [ ] Measurement Tools
- [ ] Coordinate Converter
- [ ] Changeset Explorer
- [ ] GeoJSON Import/Export
- [ ] Elevation Profile
- [ ] Map Compare (side-by-side)
- [ ] Field Papers integration
- [ ] More languages (German, French, Spanish)

---

**Built with ❤️ for the OpenStreetMap community**

*No tracking. No cookies. Just mapping.*

Designed by Christos Koulaxizis