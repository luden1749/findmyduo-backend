import express from "express";
import cors from "cors";
import pkg from "pg";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const { Pool } = pkg;

// --- CONFIG POSTGRES ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const app = express();

// ✅ Autoriser ton front local et le domaine en ligne
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://skillmatch.gg",
    "https://www.skillmatch.gg"
  ],
  methods: ["GET", "POST", "PUT", "DELETE"],
  allowedHeaders: ["Content-Type"],
}));

app.use(express.json());

// --- ROUTES --- //

// ✅ Route test
app.get("/", (req, res) => {
  res.send("🚀 API SkillMatch is running!");
});

// ✅ Récupérer tous les utilisateurs
app.get("/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM users ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la récupération des utilisateurs" });
  }
});

// ✅ Ajouter un utilisateur
app.post("/users", async (req, res) => {
  try {
    const { username, email, rank, teamplay_score, total_xp } = req.body;
    const result = await pool.query(
      "INSERT INTO users (username, email, rank, teamplay_score, total_xp) VALUES ($1, $2, $3, $4, $5) RETURNING *",
      [username, email, rank, teamplay_score, total_xp]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de l'ajout d'un utilisateur" });
  }
});

// ✅ Nouvelle route Riot (avec gestion du Riot ID name#tag)
app.get("/api/lol/summoner/:riotId", async (req, res) => {
  const { riotId } = req.params;
  const API_KEY = process.env.RIOT_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: "Clé Riot API manquante dans .env" });
  }

  try {
    // Riot ID format: Name%23Tag (ex: luden%233760)
    const [name, tag] = riotId.split("%23");

    if (!name || !tag) {
      return res.status(400).json({ error: "Format Riot ID invalide (ex: nom%23tag)" });
    }

    // Endpoint moderne Riot Account-V1
    const url = `https://europe.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${name}/${tag}`;

    console.log("🌍 Requête Riot API:", url);

    const response = await fetch(url, {
      headers: { "X-Riot-Token": API_KEY },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Erreur Riot API:", data);
      return res.status(response.status).json({ error: "Erreur API Riot", details: data });
    }

    res.json(data);
  } catch (error) {
    console.error("Erreur lors de la requête Riot:", error);
    res.status(500).json({ error: "Erreur interne serveur" });
  }
});

// --- SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Serveur backend lancé sur le port ${PORT}`);
});
