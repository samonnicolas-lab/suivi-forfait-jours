import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client";

// Sélectionne le contrat couvrant aujourd'hui (date_debut <= aujourd'hui <=
// date_fin, ou date_fin vide) ; s'il y en a plusieurs, le plus récent.
// Gère ainsi l'historique multi-contrats (§4.1) sans encore d'UI dédiée pour
// changer manuellement de contrat.
function choisirContratActif(contrats) {
  const aujourdhui = new Date().toISOString().slice(0, 10);
  const actifs = contrats.filter((c) => c.date_debut <= aujourdhui && (!c.date_fin || c.date_fin >= aujourdhui));
  if (actifs.length === 0) return null;
  return actifs.reduce((plusRecent, c) => (c.date_debut > plusRecent.date_debut ? c : plusRecent));
}

export function useContratActif() {
  const [contrats, setContrats] = useState(null);
  const [erreur, setErreur] = useState(null);

  const charger = useCallback(async () => {
    try {
      const data = await api.listerContrats();
      setContrats(data.contrats);
    } catch (err) {
      setErreur(err.message);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  const contratActif = contrats ? choisirContratActif(contrats) : null;

  return {
    loading: contrats === null && !erreur,
    contrats,
    contratActif,
    erreur,
    recharger: charger,
  };
}
