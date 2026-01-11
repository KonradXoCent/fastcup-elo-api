import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();

// 🔥 Twój ScraperAPI KEY
const SCRAPER_API_KEY = "7abac10050c143482cebc8526364960e";

// Cache
let cache = {};
const CACHE_DURATION = 60 * 1000; // 60 sekund

async function proxyFetch(url) {
  const apiUrl = `https://api.scraperapi.com/?api_key=${SCRAPER_API_KEY}&url=${encodeURIComponent(url)}`;
  const response = await fetch(apiUrl);
  return response.text();
}

async function getStats(id, mode) {
  const key = `${id}_${mode}`;
  const now = Date.now();

  // 🔥 Jeśli cache jest świeży — zwracamy go
  if (cache[key] && now - cache[key].time < CACHE_DURATION) {
    return cache[key].data;
  }

  const url = `https://cs.fastcup.net/id${id}?mode=${mode}`;
  const html = await proxyFetch(url);
  const $ = cheerio.load(html);

  const elo = parseInt($(".rating").first().text().trim(), 10);
  const eloChangeText = $(".rating-change").first().text().trim();
  const elo_change = parseInt(eloChangeText.replace("+", ""), 10) || 0;
  const wins = parseInt($('div:contains("Wins")').next().text().trim(), 10) || 0;
  const losses = parseInt($('div:contains("Losses")').next().text().trim(), 10) || 0;

  if (!elo) return null;

  const stats = { elo, elo_change, wins, losses };

  // 🔥 Zapis do cache
  cache[key] = {
    time: now,
    data: stats
  };

  return stats;
}

// JSON endpoint dla OBS
app.get("/elo/json", async (req, res) => {
  const id = req.query.id;
  const mode = req.query.mode || "5v5";

  if (!id) return res.json({ error: "Podaj ID: ?id=33781" });

  try {
    const stats = await getStats(id, mode);
    if (!stats) return res.json({ error: "Brak statystyk" });

    res.json(stats);
  } catch (err) {
    res.json({ error: "Błąd Fastcup" });
  }
});

// Tekstowy endpoint dla Nightbota
app.get("/elo", async (req, res) => {
  const id = req.query.id;
  const mode = req.query.mode || "5v5";

  if (!id) return res.send("Użycie: !elo <ID> <tryb>. Przykład: !elo 33781 5v5");

  try {
    const stats = await getStats(id, mode);
    if (!stats) return res.send(`Brak statystyk dla ID: ${id} w trybie ${mode}`);

    res.send(
      `Tryb ${mode} — ELO: ${stats.elo} | Zmiana: ${stats.elo_change} | W: ${stats.wins} | L: ${stats.losses}`
    );
  } catch (err) {
    res.send("Błąd Fastcup — spróbuj ponownie");
  }
});

app.listen(3000, () => console.log("API działa"));
