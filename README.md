# 🌤️ WeatherApp — Proiect 11: Preluam Starea Vremii

> Aplicatie web moderna pentru afisarea starii vremii, construita cu React + Express + OpenWeatherMap One Call API.

---

## 📋 Cuprins

- [Descriere](#descriere)
- [Arhitectura](#arhitectura)
- [Structura Proiect](#structura-proiect)
- [Instalare si Pornire](#instalare-si-pornire)
- [Functionalitati](#functionalitati)
- [Documentatie API](#documentatie-api)
- [Tehnologii](#tehnologii)

---

## Descriere

Aplicatia permite cautarea vremii pentru orice oras din lume, afisand:
- **Temperatura** in °C si °F
- **Ce fel de zi este** (frumoasa, ploioasa, furtuna etc.)
- **Recomandarile** (haina, umbrela)
- **Directia vantului** in cuvinte (nord, sud-vest etc.)
- **Prognoza orara** pe 24 ore
- **Prognoza zilnica** pe 7 zile
- **Rasarit / Apus** si durata zilei
- **Calitatea aerului**
- **Alerte meteo**
- **Faza lunii** pentru fiecare zi

---

## Arhitectura

```
React (:5173)
 ├── / → WeatherPage     (cautare si afisare vreme)
 ├── /history → HistoryPage   (istoricul cautarilor)
 └── /favorites → FavoritesPage (orase favorite)
      ↓ fetch catre /api (proxy Vite)
Express server.js (:5000)
      ↓ weatherService.js (procesare SEPARATA de afisare)
      ↓ → OpenWeatherMap One Call API 3.0
      ↓ → json-server (:3000) ↔ db.json (cautari + favorite)
```

**Principiu cheie**: procesarea fluxului meteo este **complet separata** de afisare — `weatherService.js` transforma datele brute OWM, iar componentele React afiseaza datele deja procesate.

---

## Structura Proiect

```
weather-app/
├── backend/                ← Serviciul de API (Render) 
│   ├── public/             
│   │   └── .gitkeep        ← Forțează Git să urmărească folderul public 
│   ├── server.js           ← Express API principal (configurat CORS pt Vercel) 
│   ├── weatherService.js   ← Logica de procesare meteo (SEPARATĂ de afișare)
│   ├── .env                ← OPENWEATHER_API_KEY (privat)
│   └── images/             ← Imagini statice servite de Express
├── frontend/               ← Interfața utilizator (Vercel) 
│   ├── src/
│   │   ├── api/
│   │   │   └── weatherApi.js ← Folosește VITE_API_URL pentru fetch 
│   │   ├── components/     ← SearchBar, CurrentWeather, Navbar, etc.
│   │   ├── pages/
│   │   │   ├── WeatherPage.jsx
│   │   │   ├── Historypage.jsx 
│   │   │   └── Favoritespage.jsx
│   │   ├── App.jsx         ← Configurare rute (React Router)
│   │   └── index.css       ← Tailwind v4 + Font-uri Google
│   ├── vercel.json         
│   ├── vite.config.js
│   └── package.json        ← Dependențe frontend
├── db.json                 ← Baza de date efemeră pe Render (căutări + favorite) 
├── package.json            ← Scripturi de start (folosesc concurrently) 
└── .gitignore              ← Include node_modules și .env.local
```

---

### Acces
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- json-server: http://localhost:3000

---

## Functionalitati

### Cerinte rezolvate din proiect:
- ✅ Cautare dupa **numele orasului** (ex: "Chicago IL")
- ✅ Afisare **temperatura in °C si °F**
- ✅ **Rasarit si apus**, umiditate, descriere vreme
- ✅ **Directia vantului in cuvinte** (nord, sud-vest, nord-nord-est etc.)
- ✅ **Tipul zilei** (frumoasa, ploioasa, furtuna, ninge etc.)
- ✅ **Haina sau umbrela** — recomandare automata
- ✅ **Procesarea meteo SEPARATA de afisare** (weatherService.js)
- ✅ **Geolocalizare** — locatia curenta din browser
- ✅ Prognoza **orara** (24h) si **zilnica** (5 zile)
- ✅ **Calitatea aerului** (PM2.5, PM10, O3, NO2)
- ✅ **Alerte meteo** active
- ✅ **Faza lunii** pentru fiecare zi
- ✅ **Index UV** cu recomandare
- ✅ **Favorit** orase cu previzualizare rapida
- ✅ **Istoricul** cautarilor (json-server)
- ✅ **Validare Joi** pe backend

---

## Documentatie API

### `GET /api/weather`
Preia datele meteo complete.

**Parametri (unul din doua):**
| Param | Tip | Descriere |
|-------|-----|-----------|
| city | string | Numele orasului (ex: "Iasi") |
| lat + lon | number | Coordonate GPS |

**Raspuns:**
```json
{
  "city": "Iași",
  "country": "RO",
  "lat": 47.1585,
  "lon": 27.6014,
  "current": {
    "tempCelsius": 18,
    "tempFahrenheit": 64,
    "feelsLikeCelsius": 16,
    "humidity": 65,
    "windSpeed": 15,
    "windDirection": { "text": "nord-vest", "emoji": "↖️", "abbr": "NV", "degrees": 315 },
    "description": "cer senin",
    "sunrise": "2026-04-15T04:23:00.000Z",
    "sunset": "2026-04-15T18:45:00.000Z"
  },
  "dayInterpretation": {
    "dayType": "frumoasa",
    "needsCoat": false,
    "needsUmbrella": false,
    "emoji": "☀️",
    "message": "Ce zi frumoasa! Cer senin si temperatura placuta.",
    "suggestion": "Zi perfecta pentru o plimbare."
  },
  "hourly": [...],
  "daily": [...],
  "alerts": []
}
```

### `GET /api/weather/air?lat=&lon=`
Calitatea aerului pentru coordonatele date.

### `GET /api/geocode?city=`
Geocodare oras → coordonate.

### `GET /api/searches`
Istoricul cautarilor (din json-server).

### `POST /api/favorites`
Adauga oras la favorite.
```json
{ "city": "Iași", "country": "RO", "lat": 47.1585, "lon": 27.6014 }
```

### `DELETE /api/favorites/:id`
Sterge din favorite.

---

## Testare

### Teste unitare Jest
```bash
npm test
```

Testeaza functiile din `weatherService.js`:
- Conversii de temperatura (Kelvin→Celsius, Celsius→Fahrenheit)
- Directia vantului (grade→cuvinte)
- Interpretarea zilei (haina, umbrela, tip zi)

### Testare manuala API (curl)
```bash
# Vremea in Iasi
curl "http://localhost:5000/api/weather?city=Iasi"

# Calitatea aerului
curl "http://localhost:5000/api/weather/air?lat=47.1&lon=27.6"

# Adauga favorit
curl -X POST http://localhost:5000/api/favorites \
  -H "Content-Type: application/json" \
  -d '{"city":"Iași","country":"RO","lat":47.1585,"lon":27.6014}'
```

---

## Tehnologii

| Categorie | Tehnologie |
|-----------|-----------|
| Frontend | React 18, React Router v6, Tailwind CSS v4 |
| Backend | Node.js, Express.js |
| Date | json-server, db.json |
| Validare | Joi |
| API extern
| Build tool | Vite |
| Hot reload | nodemon |

---

## Autori
Proiect 11 — Durnea Andrei & Lungu Christian