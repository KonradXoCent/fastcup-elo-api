import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();

const API_KEY = "qOJ2eaJE4SENQQNXNHQ2m74ZkWsjewGqp";

async function proxyFetch(url) {
  const apiUrl = `https://api.webscrapingapi.com/v2?api_key=${API_KEY}&url=${encodeURIComponent(url)}&render_js=0`;
  const response = await fetch(apiUrl);
  return response.text();
}

async function findPlayer(nick) {
  const url = `https://fastcup.net/api/search?query=${encodeURIComponent(nick)}`;

  // ❗ NORMALNY REQUEST — BEZ PROXY
  const response = await fetch(url);
  const data = await response.json();

  if (!data.players || data.players.length === 0) return null;

  const exact = data.players.find(
    p => p.nickname.toLowerCase() === nick.toLowerCase()
  );

  const player = exact || data.players[0];

  return {
    id: player.id,
    slug: player.slug,
    nickname: player.nickname
  };
}

async function getStats(slug) {
  const url = `https://fastcup.net/en/player/${slug}`;
  const html = await proxyFetch(url);
  const $ = cheerio.load(html);

  const elo = parseInt($(".player-rating-value").text().trim(), 10);

  const eloChangeText = $(".player-rating-change").first().text().trim();
  const elo_change = parseInt(eloChangeText.replace("+", ""), 10) || 0;

  const wins = parseInt($('div:contains("Wins")').next().text().trim(), 10);
  const losses = parseInt($('div:contains("Losses")').next().text().trim(), 10);

  if (!elo) return null;

  return { elo, elo_change, wins, losses };
}

// JSON endpoint for OBS
app.get("/elo/json", async (req, res) => {
  const nick = req.query.nick;
  if (!nick) return res.json({ error: "Podaj nick: ?nick=x0cent" });

  try {
    const player = await findPlayer(nick);
    if (!player) return res.json({ error: "Nie znaleziono gracza" });

    const stats = await getStats(player.slug);
    if (!stats) return res.json({ error: "Brak statystyk" });

    res.json(stats);
  } catch (err) {
    res.json({ error: "Błąd Fastcup" });
  }
});
app.listen(3000, () => console.log("API działa"));
