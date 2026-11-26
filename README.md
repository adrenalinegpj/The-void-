# THE VOID

**A curiosity-driven discovery platform where every click leads to something unexpected.**

The Void is a knowledge discovery platform designed to encourage exploration beyond traditional algorithms. It delivers random discoveries across different topics, from science and music to literature, cinema, culture, and internet mysteries.

## Features

- **Seven Categories:** Music, Books, Internet, Cinema, Culture, World, and Science.
- **35 Subcategories:** Five specialized branches under each main category.
- **Random Discoveries:** Explore unexpected facts and content.
- **Daily Discoveries:** Content rotates automatically based on a configurable cycle.
- **Secret Discoveries:** Unlock rare and hidden content.
- **Source References:** Discoveries can include links to their original sources.
- **User Authentication:** Register, log in, and manage sessions.
- **Saved Discoveries:** Save interesting content and access it later.
- **Anti-Repetition:** Avoid recently viewed discoveries.

## Tech Stack

- **Backend:** Node.js
- **Database:** SQLite
- **Frontend:** HTML, CSS, JavaScript
- **API:** RESTful API

## Project Structure

```text
THE-VOID/
│
├── public/
│   ├── index.html
│   ├── styles.css
│   └── app.js
│
├── server.mjs
├── auth.mjs
├── saved.mjs
├── seed.mjs
├── setup-branches.mjs
├── update-content.mjs
└── void.sqlite
```

## Getting Started

### 1. Requirements

- Node.js 22.13 or later.

### 2. Clone the Repository

```bash
git clone <repository-url>
cd THE-VOID
```

### 3. Initialize the Database

Run the following commands in order:

```bash
node seed.mjs
node update-content.mjs
node setup-branches.mjs
```

### 4. Start the Server

```bash
node server.mjs
```

Open:

```text
http://localhost:3000
```

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/portals` | Retrieve categories |
| GET | `/api/branches` | Retrieve subcategories |
| GET | `/api/branches/:id/discovery` | Discover content from a branch |
| GET | `/api/portals/:id/discovery` | Retrieve daily, random, or secret content |
| GET | `/api/auth/me` | Check current user |
| POST | `/api/auth/register` | Register an account |
| POST | `/api/auth/login` | Log in |
| POST | `/api/auth/logout` | Log out |
| GET | `/api/saved` | Retrieve saved discoveries |
| POST | `/api/saved/:id` | Save a discovery |
| DELETE | `/api/saved/:id` | Remove a saved discovery |

## Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 3000) |
| `APP_ORIGIN` | Application origin; HTTPS is required in production |
| `NODE_ENV` | Set to `production` for production deployment |

## Project Philosophy

The Void is built around one simple idea:

**Explore without knowing what you are looking for.**

No endless scrolling. No algorithm deciding what you should discover. Just curiosity, exploration, and unexpected knowledge.

---

**THE VOID — Enter the unknown.**
