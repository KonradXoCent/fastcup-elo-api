import express from "express";
import fetch from "node-fetch";
import * as cheerio from "cheerio";

const app = express();

const proxy = "https://corsproxy.io/?";

async function findPlayer(nick) {
  const url = proxy + `https://fastcup.net/api/search?query=${encodeURIComponent(nick)}`;
  const response = await fetch(url);
  const data = await response.json();

  if (!data.players || data.players.length === 0) return null;

  const exact = data.players.find(p => p.nickname.toLowerCase() === nick.toLowerCase());
  const player = exact || data.players[0];

  return {
    id: player.id,
    slug: player.slug,
    nickname: player.nickname
  };
}

async function getStats(slug) {
  const url = proxy + `https://fastcup.net/en/player/${slug}`;
  const response = await fetch(url);
  const html = await response.text();
  const $ = cheerio.load(html);

  const elo = $(".player-rating-value").text().trim();
  const wins = $('div:contains("Wins")').next().text().trim();
  const losses = $('div:contains("Losses")').next().text().trim();

  if (!elo) return null;

  return { elo, wins, losses };
}

app.get("/elo", async (req, res) => {
  const nick = req.query.nick;
  if (!nick) return res.send("Podaj nick: !elo nick");

  try {
    const player = await findPlayer(nick);

    if (!player) {
      return res.send(`Nie znaleziono gracza o nicku: ${nick}`);
    }

    const stats = await getStats(player.slug);

    if (!stats) {
      return res.send(`Nie udało się pobrać statystyk gracza: ${nick}`);
    }

    res.send(`${player.nickname} — ELO: ${stats.elo} | W: ${stats.wins} | L: ${stats.losses}`);
  } catch (err) {
    res.send("Błąd Fastcup — spróbuj ponownie");
  }
});

app.listen(3000, () => console.log("API działa"));
