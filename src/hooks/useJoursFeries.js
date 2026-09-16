import { useEffect, useRef, useState } from "react";
import { api } from "../api/client";

// Récupère (et met en cache en mémoire, pour la durée de la session) les
// jours fériés officiels d'une zone pour les années demandées. Le cache
// serveur (table jours_feries_officiels) évite déjà de rappeler l'API
// gouv.fr à chaque utilisateur ; ce cache client évite de rappeler notre
// propre fonction serverless à chaque changement de mois.
export function useJoursFeries(zone, annees) {
  const cache = useRef(new Map()); // "zone-annee" -> { date: libelle }
  const [, forceRender] = useState(0);
  const cleAnnees = annees.join(",");

  useEffect(() => {
    if (!zone) return;
    let annule = false;
    const manquantes = annees.filter((a) => !cache.current.has(`${zone}-${a}`));
    if (manquantes.length === 0) return;

    Promise.all(
      manquantes.map((annee) =>
        api.joursFeries(zone, annee).then((data) => {
          cache.current.set(`${zone}-${annee}`, data.feries);
        }).catch(() => {
          cache.current.set(`${zone}-${annee}`, {});
        })
      )
    ).then(() => {
      if (!annule) forceRender((n) => n + 1);
    });

    return () => { annule = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zone, cleAnnees]);

  const feries = {};
  for (const annee of annees) {
    Object.assign(feries, cache.current.get(`${zone}-${annee}`) || {});
  }
  return feries;
}
