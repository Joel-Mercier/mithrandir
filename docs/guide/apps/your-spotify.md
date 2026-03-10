# <img src="https://cdn.jsdelivr.net/gh/selfhst/icons/png/your-spotify.png" width="32" height="32" style="display:inline;vertical-align:middle;margin-right:8px"> Your Spotify

Spotify listening statistics and history tracker — visualize your listening habits with detailed analytics.

| | |
| --- | --- |
| **Images** | `yooooomi/your_spotify_server`, `yooooomi/your_spotify_client`, `mongo:6` |
| **Web UI** | `http://your-server:3456` |
| **API** | `http://your-server:8085` |
| **Config path** | `{BASE_DIR}/yourspotify/db` |
| **Website** | [your-spotify](https://github.com/Yooooomi/your_spotify) |
| **Source code** | [GitHub](https://github.com/Yooooomi/your_spotify) |

## Resource Impact

| | |
| --- | --- |
| **Performance** | Low — History tracking and analytics |
| **Storage** | Medium — MongoDB database grows with listening history |

## Installation

```sh
mithrandir install yourspotify
```

## Required Secrets

| Variable | Description |
| --- | --- |
| `YOURSPOTIFY_CLIENT_ID` | Spotify application Client ID |
| `YOURSPOTIFY_CLIENT_SECRET` | Spotify application Client Secret |

## Prerequisites: Spotify Developer Application

Before installing Your Spotify, you need to create a Spotify Developer Application:

1. Go to the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click **Create app**
4. Fill in the app name (e.g. "Your Spotify") and description
5. Set the **Redirect URI** to your API endpoint followed by `/oauth/spotify/callback`:
   - Without HTTPS: `http://your-server-ip:8085/oauth/spotify/callback`
   - With HTTPS: `https://yourspotify-api.yourdomain.duckdns.org/oauth/spotify/callback`
6. Check the **Web API** checkbox
7. Save the app and note the **Client ID** and **Client Secret**

## Setup

1. After installation, open the web UI at `http://your-server:3456`
2. Log in with your Spotify account
3. Your Spotify will start tracking your listening history

## HTTPS

When HTTPS is enabled, Your Spotify uses two subdomains:
- `yourspotify.yourdomain.duckdns.org` — Web UI (port 3456)
- `yourspotify-api.yourdomain.duckdns.org` — API server (port 8085)

Make sure to update your Spotify Developer Application's redirect URI to use the HTTPS API endpoint.
