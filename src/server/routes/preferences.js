import { Router } from "express";
import { getSql } from "../db.js";
import { ah } from "../asyncHandler.js";

const router = Router();

router.get("/", ah(async (req, res) => {
  const sql = getSql();
  const rows = await sql`
    select onboarding_vu from preferences_utilisateur where utilisateur_id = ${req.session.userId}
  `;
  res.json({ onboardingVu: rows[0]?.onboarding_vu ?? false });
}));

router.post("/", ah(async (req, res) => {
  const onboardingVu = !!(req.body || {}).onboardingVu;
  const sql = getSql();
  await sql`
    insert into preferences_utilisateur (utilisateur_id, onboarding_vu)
    values (${req.session.userId}, ${onboardingVu})
    on conflict (utilisateur_id) do update set onboarding_vu = excluded.onboarding_vu
  `;
  res.json({ ok: true });
}));

export default router;
