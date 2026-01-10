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
  const url = `https://cs.fastcup.net/api/search?query=${encodeURIComponent(nick)}`;
  const response = await fetch(url);
  const data = await response.json();

  if (!data.players || data.players.length === 0) return null;

  const exact = data.players.find(
    p => p.nickname.toLowerCase() === nick.toLowerCase()
  );

  const player = exact || data.players[0];

  return {
    id: player.id,
    nickname: player.nickname
  };
}


async function getStats(id) {
  const url = `https://cs.fastcup.net/id${id}`;
  const html = await proxyFetch(url);
  const $ = cheerio.load(html);

  const elo = parseInt($(".rating").first().text().trim(), 10);

  const eloChangeText = $(".rating-change").first().text().trim();
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

    const stats = await getStats(player.id);
    if (!stats) return res.json({ error: "Brak statystyk" });

    res.json(stats);
  } catch (err) {
    res.json({ error: "Błąd Fastcup" });
  }
});
app.get("/elo", async (req, res) => {
  const nick = req.query.nick;
  if (!nick) return res.send("Podaj nick: !elo nick");

  try {
    const player = await findPlayer(nick);
    if (!player) return res.send(`Nie znaleziono gracza: ${nick}`);

    const stats = await getStats(player.id);
    if (!stats) return res.send(`Brak statystyk dla: ${nick}`);

    res.send(
      `${player.nickname} — ELO: ${stats.elo} | Zmiana: ${stats.elo_change} | W: ${stats.wins} | L: ${stats.losses}`
    );
  } catch (err) {
    res.send("Błąd Fastcup — spróbuj ponownie");
  }
});

app.listen(3000, () => console.log("API działa"));
