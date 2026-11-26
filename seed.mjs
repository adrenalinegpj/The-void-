import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";

const db = new DatabaseSync(
  fileURLToPath(new URL("./void.sqlite", import.meta.url))
);

const initialized = db.prepare(`
  SELECT name FROM sqlite_master
  WHERE type = 'table' AND name = 'categories'
`).get();

if (!initialized) {
  console.error(
    "Run npm start once to initialize the database, " +
    "stop it, then run npm run seed."
  );
  process.exit(1);
}

db.exec("PRAGMA foreign_keys = ON;");

const categories = [
  {
    id: "music",
    name: "Music & Audio",
    color: "#b64d58",
    symbol: "⌁",
    topics: [
      "Global music", "Underground artists", "Indie", "Alternative",
      "Rap & hip-hop", "K-pop", "J-pop", "Arabic music",
      "Forgotten songs", "Albums", "Lyrics analysis", "Music history"
    ]
  },
  {
    id: "books",
    name: "Books & Literature",
    color: "#a28add",
    symbol: "⋈",
    topics: [
      "Fantasy", "Dark academia", "Thrillers", "Romance",
      "Science fiction", "Horror literature", "Manga", "Manhwa",
      "Webtoons", "Arabic literature", "International authors",
      "Poetry", "Hidden meanings"
    ]
  },
  {
    id: "internet",
    name: "Internet Culture",
    color: "#c7dd75",
    symbol: "⊹",
    topics: [
      "Internet mysteries", "Lost media", "Online communities",
      "Digital folklore", "Memes", "Weird websites",
      "Retro internet", "Digital aesthetics", "Gaming culture"
    ]
  },
  {
    id: "cinema",
    name: "Cinema & Entertainment",
    color: "#de925d",
    symbol: "◈",
    topics: [
      "Cult films", "Psychological cinema", "Horror",
      "International cinema", "Anime", "K-dramas",
      "Forgotten television", "Film symbolism",
      "Behind the scenes", "Underrated characters"
    ]
  },
  {
    id: "culture",
    name: "Identity & Culture",
    color: "#dca0b9",
    symbol: "✳",
    topics: [
      "Fashion aesthetics", "Thrifting", "Digital nostalgia",
      "Self-expression", "Psychology", "Relationships",
      "Slang", "Youth culture", "Trend origins",
      "Languages", "Food cultures"
    ]
  },
  {
    id: "world",
    name: "Worlds & Stories",
    color: "#83ced2",
    symbol: "◎",
    topics: [
      "Philosophy", "Mythology", "Folklore", "Forgotten history",
      "Art", "Photography", "Architecture", "Geography",
      "Hidden places", "Urban legends", "Unsolved mysteries"
    ]
  },
  {
    id: "science",
    name: "Science & The Unknown",
    color: "#e4ce75",
    symbol: "⟁",
    topics: [
      "Science", "Technology", "Space", "Astronomy",
      "Animals", "Nature", "Strange facts", "Random knowledge"
    ]
  }
];

const entries = [
  {
    id: "music-01",
    category: "music",
    title: "A sound outside your algorithm",
    body: "Enter the Smithsonian Folkways collection. Pick a country you have never searched for. Follow a recording—not a recommendation feed.",
    source: "https://folkways.si.edu/",
    sourceName: "Smithsonian Folkways",
    region: "Global"
  },
  {
    id: "music-02",
    category: "music",
    title: "Start with Africa",
    body: "Choose an African country in the Folkways geography index. Find one unfamiliar recording, then follow the artist or instrument into another search.",
    source: "https://folkways.si.edu/",
    sourceName: "Smithsonian Folkways",
    region: "Africa"
  },
  {
    id: "books-01",
    category: "books",
    title: "A library in another language",
    body: "Hindawi makes books freely accessible. Open an Arabic work you have never encountered. Start with a title that makes you curious.",
    source: "https://www.hindawi.org/ar",
    sourceName: "Hindawi",
    region: "Arabic-speaking world"
  },
  {
    id: "books-02",
    category: "books",
    title: "青空文庫",
    body: "Aozora Bunko is a Japanese digital library. Browse by author, title, or newly added work. A different literary internet is waiting.",
    source: "https://www.aozora.gr.jp/index.html",
    sourceName: "Aozora Bunko",
    region: "Japan"
  },
  {
    id: "internet-01",
    category: "internet",
    title: "Your favorite website, before you knew it",
    body: "Give the Wayback Machine a familiar website address. Choose an older capture. Look for the pieces of its identity that disappeared.",
    source: "https://web.archive.org/",
    sourceName: "Internet Archive",
    region: "Global"
  },
  {
    id: "internet-02",
    category: "internet",
    title: "A digital attic",
    body: "The Internet Archive collects texts, audio, movies, software, and more. Choose a medium you usually ignore. Search for something oddly specific.",
    source: "https://archive.org/",
    sourceName: "Internet Archive",
    region: "Global"
  },
  {
    id: "cinema-01",
    category: "cinema",
    title: "Before your watchlist",
    body: "The Korean Film Archive links to its Korean Classic Film channel. Pick an unfamiliar title and enter Korean cinema beyond the usual recommendations.",
    source: "https://eng.koreafilm.or.kr/main",
    sourceName: "Korean Film Archive",
    region: "South Korea"
  },
  {
    id: "cinema-02",
    category: "cinema",
    title: "Follow a name in the credits",
    body: "Explore the Korean Movie Database. Choose a film, then follow one cast or crew member to another work. Let the credits become a map.",
    source: "https://www.kmdb.or.kr/eng/main",
    sourceName: "Korean Film Archive · KMDb",
    region: "South Korea"
  },
  {
    id: "culture-01",
    category: "culture",
    title: "Build a moodboard without a feed",
    body: "Browse museum collections through Google Arts & Culture. Save three visual details: a texture, a silhouette, and a color. Give the combination your own name.",
    source: "https://artsandculture.google.com/",
    sourceName: "Google Arts & Culture",
    region: "Global"
  },
  {
    id: "culture-02",
    category: "culture",
    title: "Borrow nothing. Notice everything.",
    body: "Visit a cultural collection outside your own region. Notice how its objects are described by the institution that holds them. Context comes before aesthetic.",
    source: "https://artsandculture.google.com/partner",
    sourceName: "Google Arts & Culture",
    region: "Global"
  },
  {
    id: "world-01",
    category: "world",
    title: "An object looking for a new story",
    body: "Smithsonian Open Access offers reusable digital collection items. Find one unfamiliar object. Read its record before imagining where its story could lead.",
    source: "https://www.si.edu/openaccess",
    sourceName: "Smithsonian Open Access",
    region: "Global"
  },
  {
    id: "world-02",
    category: "world",
    title: "A museum with no journey home",
    body: "Take a virtual museum tour. Pause at something you would normally walk past. Spend one minute looking before reading its label.",
    source: "https://artsandculture.google.com/project/streetviews",
    sourceName: "Google Arts & Culture",
    region: "Global"
  },
  {
    id: "science-01",
    category: "science",
    title: "A fragment of the cosmos",
    body: "Astronomy Picture of the Day pairs a cosmic image with an astronomer's explanation. Look first. Read second. Notice what your first guess missed.",
    source: "https://science.nasa.gov/apod/",
    sourceName: "NASA · APOD",
    region: "Space"
  },
  {
    id: "science-02",
    category: "science",
    title: "The sky on another day",
    body: "Open the APOD archive. Choose an unfamiliar date and explore its image. Your next discovery does not have to be today's.",
    source: "https://science.nasa.gov/apod/archive/",
    sourceName: "NASA · APOD",
    region: "Space"
  }
];

const insertCategory = db.prepare(`
  INSERT INTO categories (id, name, topics)
  VALUES (?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    name = excluded.name,
    topics = excluded.topics
`);

const insertPortal = db.prepare(`
  INSERT INTO portals (id, category_id, color, symbol, position)
  VALUES (?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    category_id = excluded.category_id,
    color = excluded.color,
    symbol = excluded.symbol,
    position = excluded.position
`);

const insertDiscovery = db.prepare(`
  INSERT INTO discoveries (
    id, category_id, title, body, source_url,
    source_name, region, language, rare
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    title = excluded.title,
    body = excluded.body,
    source_url = excluded.source_url,
    source_name = excluded.source_name,
    region = excluded.region,
    language = excluded.language,
    rare = excluded.rare
`);

db.exec("BEGIN");

try {
  categories.forEach((category, index) => {
    insertCategory.run(
      category.id,
      category.name,
      JSON.stringify(category.topics)
    );

    insertPortal.run(
      `void_${String(index + 1).padStart(2, "0")}`,
      category.id,
      category.color,
      category.symbol,
      index
    );

    // Original fictional fragments, clearly labeled.
    insertDiscovery.run(
      `${category.id}-secret`,
      category.id,
      "You found the space between.",
      "Original VOID fragment: A cursor blinks inside a room " +
        "that has never had a door. For a moment, it blinks back.",
      null,
      null,
      "Fiction",
      "en",
      1
    );
  });

  for (const entry of entries) {
    insertDiscovery.run(
      entry.id,
      entry.category,
      entry.title,
      entry.body,
      entry.source || null,
      entry.sourceName || null,
      entry.region || null,
      entry.language || "en",
      0
    );
  }

  db.exec("COMMIT");
  console.log("Seeded 7 portals, 14 discoveries, and 7 secret fragments.");
} catch (error) {
  db.exec("ROLLBACK");
  throw error;
} finally {
  db.close();
}