-- Cache des jours fériés officiels (calendrier.api.gouv.fr), par zone.
-- Évite de rappeler l'API externe à chaque affichage du calendrier — voir
-- cahier des charges §4.3. Rempli à la volée par
-- netlify/functions/jours-feries.js au premier appel pour une zone/année.

create table if not exists jours_feries_officiels (
  zone text not null,
  date date not null,
  libelle text not null,
  primary key (zone, date)
);

alter table jours_feries_officiels enable row level security;

grant select, insert on jours_feries_officiels to service_role;
