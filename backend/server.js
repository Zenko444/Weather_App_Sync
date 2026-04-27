/**
 * server.js — Express Backend
 * ─────────────────────────────────────────────────────────────────────────
 * Serverul principal al aplicatiei Weather App.
 * Arhitectura: React (5173) → Express (5000) → OWM API + json-server (3000)
 */

// Incarca variabilele din .env inainte de orice altceva
require("dotenv").config({ path: __dirname + "/.env" });

const express = require("express");
const cors = require("cors");
const path = require("path");
const Joi = require("joi");

// Modul de procesare meteo — SEPARAT de afisare (cerinta proiect)
const weatherService = require("./weatherService");

// ─────────────────────────────────────────────────────────────────────────
// CONFIGURARE EXPRESS
// ─────────────────────────────────────────────────────────────────────────

const app = express();

// Configurare CORS pentru a permite cereri din Vercel si din localhost 
app.use(cors({
  origin: [
    "https://weather-app-ywij.vercel.app", // Link-ul de productie principal
    "https://weather-app-ywij-77a9bxa14-andreid-33s-projects.vercel.app/", // Link-ul exact pe care esti acum
    "http://localhost:5173"
  ]
}));
app.use(express.json());

// Ruta statica pentru imagini (similar cu citate-autori)
app.use("/images", express.static(path.join(__dirname, "images")));

const API_KEY = process.env.OPENWEATHER_API_KEY;
const JSON_SERVER_URL = process.env.JSON_SERVER_URL || "http://localhost:3000";
// Render setează process.env.PORT automat [cite: 35]
const PORT = process.env.PORT || 5000; 

// Verificam daca avem cheia API la pornire
if (!API_KEY || API_KEY === "your_openweathermap_api_key_here") {
  console.warn(
    "⚠️  AVERTISMENT: Cheia API OpenWeatherMap nu este configurata!"
  );
  console.warn("   Seteaza OPENWEATHER_API_KEY in backend/.env");
}

// ─────────────────────────────────────────────────────────────────────────
// MIDDLEWARE: Validare parametri cu Joi (similar cu citate-autori lab 4)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Schema Joi pentru cautarea dupa oras
 */
const cityQuerySchema = Joi.object({
  city: Joi.string().min(2).max(100).required(),
}).unknown(true);

/**
 * Schema Joi pentru cautarea dupa coordonate
 */
const coordsQuerySchema = Joi.object({
  lat: Joi.number().min(-90).max(90).required(),
  lon: Joi.number().min(-180).max(180).required(),
}).unknown(true);

/**
 * Schema Joi pentru salvarea unei locatii favorite
 */
const favoriteSchema = Joi.object({
  city: Joi.string().min(2).max(100).required(),
  country: Joi.string().length(2).required(),
  lat: Joi.number().min(-90).max(90).required(),
  lon: Joi.number().min(-180).max(180).required(),
});

// ─────────────────────────────────────────────────────────────────────────
// RUTE: Health check
// ─────────────────────────────────────────────────────────────────────────

app.get("/", (req, res) => {
  res.json({
    message: "Weather App API functioneaza!",
    version: "1.0.0",
    endpoints: {
      weather_by_city: "/api/weather?city=Iasi",
      weather_by_coords: "/api/weather?lat=47.1&lon=27.6",
      air_quality: "/api/weather/air?lat=47.1&lon=27.6",
      geocode: "/api/geocode?city=Iasi",
      searches: "/api/searches",
      favorites: "/api/favorites",
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────
// RUTE: Meteo — procesarea se face in weatherService.js
// ─────────────────────────────────────────────────────────────────────────

app.get("/api/weather", async (req, res) => {
  try {
    const { city, lat, lon } = req.query;

    let latitude, longitude, cityName, countryCode;

    if (city) {
      const { error } = cityQuerySchema.validate(req.query);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      const geoData = await weatherService.geocodeCity(city, API_KEY);
      latitude = geoData.lat;
      longitude = geoData.lon;
      cityName = geoData.name;
      countryCode = geoData.country;
    } else if (lat && lon) {
      const { error } = coordsQuerySchema.validate(req.query);
      if (error) {
        return res.status(400).json({ error: error.details[0].message });
      }

      latitude = parseFloat(lat);
      longitude = parseFloat(lon);
      cityName = req.query.cityName || "Locatie curenta";
      countryCode = req.query.country || "";
    } else {
      return res.status(400).json({
        error: "Furnizeaza fie city=, fie lat= si lon= ca parametri.",
      });
    }

    const weatherData = await weatherService.fetchWeatherByCoords(
      latitude,
      longitude,
      API_KEY,
      cityName,
      countryCode
    );

    try {
      const searchesResp = await fetch(`${JSON_SERVER_URL}/searches`);
      const searches = await searchesResp.json();

      const alreadySaved = searches
        .slice(-10)
        .some(
          (s) =>
            s.city.toLowerCase() === cityName.toLowerCase() &&
            s.country === countryCode
        );

      if (!alreadySaved) {
        const newId =
          searches.length > 0
            ? Math.max(...searches.map((s) => Number(s.id))) + 1
            : 1;

        await fetch(`${JSON_SERVER_URL}/searches`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: newId.toString(),
            city: cityName,
            country: countryCode,
            lat: latitude,
            lon: longitude,
            timestamp: new Date().toISOString(),
          }),
        });
      }
    } catch (dbError) {
      console.warn("Nu s-a putut salva cautarea in DB:", dbError.message);
    }

    res.json(weatherData);
  } catch (error) {
    console.error("Eroare weather:", error.message);

    if (error.response?.status === 401) {
      return res
        .status(401)
        .json({ error: "Cheie API OpenWeatherMap invalida." });
    }
    if (error.response?.status === 429) {
      return res
        .status(429)
        .json({ error: "Limita de cereri API depasita. Incearca mai tarziu." });
    }
    if (error.message.includes("nu a fost gasit")) {
      return res.status(404).json({ error: error.message });
    }

    res.status(500).json({ error: "Nu s-au putut prelua datele meteo." });
  }
});

app.get("/api/weather/air", async (req, res) => {
  try {
    const { error } = coordsQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { lat, lon } = req.query;
    const airData = await weatherService.fetchAirQuality(
      parseFloat(lat),
      parseFloat(lon),
      API_KEY
    );

    if (!airData) {
      return res
        .status(404)
        .json({ error: "Date calitate aer indisponibile." });
    }

    res.json(airData);
  } catch (error) {
    console.error("Eroare air quality:", error.message);
    res.status(500).json({ error: "Nu s-au putut prelua datele calitatii aerului." });
  }
});

app.get("/api/geocode", async (req, res) => {
  try {
    const { error } = cityQuerySchema.validate(req.query);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const geoData = await weatherService.geocodeCity(req.query.city, API_KEY);
    res.json(geoData);
  } catch (error) {
    console.error("Eroare geocode:", error.message);
    if (error.message.includes("nu a fost gasit")) {
      return res.status(404).json({ error: error.message });
    }
    res.status(500).json({ error: "Geocodarea a esuat." });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// RUTE: Istoricul cautarilor 
// ─────────────────────────────────────────────────────────────────────────

app.get("/api/searches", async (req, res) => {
  try {
    const response = await fetch(`${JSON_SERVER_URL}/searches`);
    const data = await response.json();

    const sorted = data
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 20);

    res.json(sorted);
  } catch (error) {
    console.error("Eroare searches GET:", error.message);
    res.status(500).json({ error: "Nu s-au putut prelua cautarile." });
  }
});

app.delete("/api/searches/:id", async (req, res) => {
  try {
    if (isNaN(req.params.id)) {
      return res.status(400).json({ error: "ID invalid." });
    }

    const response = await fetch(
      `${JSON_SERVER_URL}/searches/${req.params.id}`,
      { method: "DELETE" }
    );

    if (!response.ok) {
      return res.status(404).json({ error: "Cautarea nu a fost gasita." });
    }

    res.json({ message: "Cautarea a fost stearsa." });
  } catch (error) {
    console.error("Eroare searches DELETE:", error.message);
    res.status(500).json({ error: "Nu s-a putut sterge cautarea." });
  }
});

app.delete("/api/searches", async (req, res) => {
  try {
    const response = await fetch(`${JSON_SERVER_URL}/searches`);
    const searches = await response.json();

    await Promise.all(
      searches.map((s) =>
        fetch(`${JSON_SERVER_URL}/searches/${s.id}`, { method: "DELETE" })
      )
    );

    res.json({ message: "Istoricul a fost sters." });
  } catch (error) {
    console.error("Eroare searches DELETE all:", error.message);
    res.status(500).json({ error: "Nu s-a putut sterge istoricul." });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// RUTE: Orase favorite 
// ─────────────────────────────────────────────────────────────────────────

app.get("/api/favorites", async (req, res) => {
  try {
    const response = await fetch(`${JSON_SERVER_URL}/favorites`);
    const data = await response.json();
    res.json(data);
  } catch (error) {
    console.error("Eroare favorites GET:", error.message);
    res.status(500).json({ error: "Nu s-au putut prelua favoritele." });
  }
});

app.post("/api/favorites", async (req, res) => {
  const { error } = favoriteSchema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  try {
    const response = await fetch(`${JSON_SERVER_URL}/favorites`);
    const favorites = await response.json();

    const exists = favorites.some(
      (f) =>
        f.city.toLowerCase() === req.body.city.toLowerCase() &&
        f.country === req.body.country
    );

    if (exists) {
      return res
        .status(409)
        .json({ error: "Orasul este deja la favorite." });
    }

    const newId =
      favorites.length > 0
        ? Math.max(...favorites.map((f) => Number(f.id))) + 1
        : 1;

    const newFavorite = {
      id: newId.toString(),
      ...req.body,
      addedAt: new Date().toISOString(),
    };

    const postResp = await fetch(`${JSON_SERVER_URL}/favorites`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newFavorite),
    });

    const data = await postResp.json();
    res.status(201).json(data);
  } catch (error) {
    console.error("Eroare favorites POST:", error.message);
    res.status(500).json({ error: "Nu s-a putut adauga la favorite." });
  }
});

app.delete("/api/favorites/:id", async (req, res) => {
  try {
    if (isNaN(req.params.id)) {
      return res.status(400).json({ error: "ID invalid." });
    }

    const checkResp = await fetch(
      `${JSON_SERVER_URL}/favorites/${req.params.id}`
    );
    if (!checkResp.ok) {
      return res
        .status(404)
        .json({ error: "Favoritele nu au fost gasite." });
    }

    await fetch(`${JSON_SERVER_URL}/favorites/${req.params.id}`, {
      method: "DELETE",
    });

    res.json({ message: "Oras sters din favorite." });
  } catch (error) {
    console.error("Eroare favorites DELETE:", error.message);
    res.status(500).json({ error: "Nu s-a putut sterge din favorite." });
  }
});

// ─────────────────────────────────────────────────────────────────────────
// PORNIRE SERVER
// ─────────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`\n🌤️  Weather App Server pornit pe portul ${PORT}`); // Modificat putin mesajul conform [cite: 36]
  console.log(`   → json-server: ${JSON_SERVER_URL}`);
  console.log(`   → Cheie OWM: ${API_KEY ? "✅ configurata" : "❌ LIPSA"}\n`);
});

module.exports = app;