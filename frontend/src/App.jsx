/**
 * App.jsx — Definirea rutelor React Router
 * ─────────────────────────────────────────────────────────────────────────
 * Structura rutelor:
 *   /           → WeatherPage  (pagina principala meteo)
 *   /history    → HistoryPage  (istoricul cautarilor)
 *   /favorites  → FavoritesPage (orase favorite)
 * ─────────────────────────────────────────────────────────────────────────
 */

import { BrowserRouter, Routes, Route, useLocation, useSearchParams } from "react-router-dom";
import { useEffect } from "react";
import Navbar from "./components/Navbar";
import WeatherPage from "./pages/WeatherPage";
import HistoryPage from "./pages/Historypage";
import FavoritesPage from "./pages/FavoritesPage";

/**
 * Wrapper care intercepteaza parametrul ?city= din URL
 * Permite navigarea din HistoryPage direct la cautarea unui oras
 */
function WeatherPageWrapper() {
  const [searchParams] = useSearchParams();
  const city = searchParams.get("city");

  // Daca URL-ul contine ?city=..., declanseaza cautarea automat
  // (logica e in WeatherPage via useEffect)
  return <WeatherPage initialCity={city} />;
}

export default function App() {
  return (
    // BrowserRouter furnizeaza contextul de rutare intregii aplicatii
    // Link si useNavigate functioneaza DOAR in interiorul sau
    <BrowserRouter>
      {/* Navbar sticky — vizibila pe toate paginile */}
      <Navbar />

      <Routes>
        {/* Ruta principala — afisare vreme */}
        <Route path="/" element={<WeatherPageWrapper />} />

        {/* Ruta istoricul cautarilor */}
        <Route path="/history" element={<HistoryPage />} />

        {/* Ruta orase favorite */}
        <Route path="/favorites" element={<FavoritesPage />} />
      </Routes>
    </BrowserRouter>
  );
}
