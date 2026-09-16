import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Connexion from "./screens/Connexion";
import Calendrier from "./screens/Calendrier";
import Semaine from "./screens/Semaine";
import Contrats from "./screens/Contrats";
import Export from "./screens/Export";
import Reglages from "./screens/Reglages";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/connexion" element={<Connexion />} />

          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<Calendrier />} />
            <Route path="/semaine" element={<Semaine />} />
            <Route path="/contrats" element={<Contrats />} />
            <Route path="/export" element={<Export />} />
            <Route path="/reglages" element={<Reglages />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
