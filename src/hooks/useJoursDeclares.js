import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client";

// Jours explicitement déclarés pour un contrat (les jours non présents dans
// la map utilisent le repli par défaut de resolveDecl : week-end -> repos,
// jour ouvré -> travaillé).
export function useJoursDeclares(contratId) {
  const [parJour, setParJour] = useState({});
  const plagesChargees = useRef(new Set());

  useEffect(() => {
    setParJour({});
    plagesChargees.current = new Set();
  }, [contratId]);

  const garantirPlage = useCallback(
    async (from, to) => {
      if (!contratId) return;
      const cle = `${from}|${to}`;
      if (plagesChargees.current.has(cle)) return;
      plagesChargees.current.add(cle);
      try {
        const data = await api.listerJoursDeclares(contratId, from, to);
        setParJour((prev) => {
          const next = { ...prev };
          for (const j of data.jours) next[j.date] = { matin: j.type_matin, apresmidi: j.type_apresmidi };
          return next;
        });
      } catch {
        plagesChargees.current.delete(cle);
      }
    },
    [contratId]
  );

  const enregistrer = useCallback(
    async (jours) => {
      await api.enregistrerJoursDeclares(contratId, jours);
      setParJour((prev) => {
        const next = { ...prev };
        for (const j of jours) next[j.date] = { matin: j.matin, apresmidi: j.apresmidi };
        return next;
      });
    },
    [contratId]
  );

  return { parJour, garantirPlage, enregistrer };
}
