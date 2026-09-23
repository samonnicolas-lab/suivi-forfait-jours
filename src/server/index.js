import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { migrer } from "./db.js";
import { requireSession } from "./authMaison.js";
import contratsRouter from "./routes/contrats.js";
import joursDeclaresRouter from "./routes/joursDeclares.js";
import joursFeriesRouter from "./routes/joursFeries.js";
import exporterMoisRouter from "./routes/exporterMois.js";
import preferencesRouter from "./routes/preferences.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST_DIR = path.join(__dirname, "..", "..", "dist");
const PORT = Number(process.env.PORT || 4000);

const app = express();
app.set("trust proxy", true); // derrière Caddy : req.ip = IP réelle du client
app.use(express.json());

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/contrats", requireSession, contratsRouter);
app.use("/api/jours-declares", requireSession, joursDeclaresRouter);
app.use("/api/jours-feries", requireSession, joursFeriesRouter);
app.use("/api/exporter-mois", requireSession, exporterMoisRouter);
app.use("/api/preferences", requireSession, preferencesRouter);

// Fichiers statiques du build Vite, avec repli sur index.html pour les
// routes React Router côté client.
app.use(express.static(DIST_DIR));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(DIST_DIR, "index.html"));
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error(err);
  res.status(err.status || 500).json({ error: err.expose ? err.message : "Erreur interne du serveur." });
});

migrer()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`suivi-forfait-jours en écoute sur le port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Échec de l'initialisation de la base de données :", err);
    process.exit(1);
  });
