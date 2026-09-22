// Vérifie la session auprès du service d'authentification partagé
// (auth-maison, cookie posé sur .carlezia.fr) au lieu de gérer une session
// maison basée sur Google OAuth. Une requête serveur-à-serveur vers /me,
// en transmettant le cookie reçu du navigateur.
const AUTH_MAISON_URL = (process.env.AUTH_MAISON_URL || "https://auth.carlezia.fr").replace(/\/$/, "");

export async function requireSession(req, res, next) {
  try {
    const cookie = req.headers.cookie || "";
    const reponse = await fetch(`${AUTH_MAISON_URL}/me`, { headers: { cookie } });
    const data = await reponse.json();

    if (!data.authenticated) {
      return res.status(401).json({ error: "Non connecté." });
    }

    req.session = { userId: data.id, email: data.email };
    next();
  } catch (err) {
    console.error("Échec de la vérification de session auprès d'auth-maison :", err);
    res.status(502).json({ error: "Service d'authentification indisponible." });
  }
}
