// index.js
import express from "express";
import cors from "cors";
import pkg from "pg";
import dotenv from "dotenv";
import fetch from "node-fetch"; // si tu es en Node 18+, pas besoin d’installer

dotenv.config();

const { Pool } = pkg;

// Connexion à ta base PostgreSQL (Supabase)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const app = express();
app.use(cors());
app.use(express.json());

// --- ROUTES ---

// ✅ Route test
app.get("/", (req, res) => {
  res.send("🚀 API FindMyDuo is running!");
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

const PORT = process.env.PORT || 5000;



// 🔹 Route pour récupérer les infos d'un joueur League of Legends
app.get("/api/lol/summoner/:name", async (req, res) => {
  const { name } = req.params;
  const API_KEY = process.env.RIOT_API_KEY;

  if (!API_KEY) {
    return res.status(500).json({ error: "Clé Riot API manquante dans .env" });
  }

  try {
    const url = `https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodeURIComponent(
      name
    )}`;
    
console.log("🔑 Clé utilisée:", API_KEY);
console.log("🌍 URL:", `https://euw1.api.riotgames.com/lol/summoner/v4/summoners/by-name/${encodeURIComponent(name)}`);

    const response = await fetch(url, {
      headers: { "X-Riot-Token": API_KEY },
    });

    // 404 → joueur introuvable
    if (response.status === 404) {
      return res.status(404).json({ error: "Joueur introuvable" });
    }

    // toute autre erreur API
    if (!response.ok) {
      const text = await response.text();
      console.error("Erreur Riot API:", text);
      return res
        .status(response.status)
        .json({ error: "Erreur de la Riot API" });
    }

    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Erreur de connexion Riot API:", error);
    res.status(500).json({ error: "Erreur interne serveur" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Serveur backend lancé sur le port ${PORT}`);
});
