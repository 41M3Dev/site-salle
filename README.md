# Où est ma salle ?

Petite appli pour retrouver la salle de cours d'une classe (contexte alternance :
les classes ne sont pas toutes présentes en même temps, et gardent en général la
même salle sur la semaine).

- **Page publique** (`/`) : un élève choisit sa classe et voit sa salle.
- **Admin** (`/admin.html`) : gestion des salles, classes et attributions,
  protégée par mot de passe.

## Stack

- Backend : Node.js + Express
- Stockage : fichier JSON (`data/data.json`), via le module `fs/promises`
- Frontend : HTML/CSS/JS vanilla, mobile-first
- Auth admin : mot de passe simple + cookie de session signé
- Déploiement : Docker (prêt pour Dokploy)

## Lancer en local

```bash
npm install
cp .env.example .env
# éditer .env pour définir ADMIN_PASSWORD et SESSION_SECRET

npm run init-data          # crée data.json (structure vide) si nécessaire
npm run init-data -- --seed  # (optionnel) ajoute des données de démo

npm start                # http://localhost:3000
```

En développement, `npm run dev` relance le serveur automatiquement à chaque
changement de fichier.

- Page publique : http://localhost:3000/
- Admin : http://localhost:3000/admin.html (mot de passe = `ADMIN_PASSWORD`)

## Variables d'environnement

| Variable         | Description                                      | Défaut                     |
|-------------------|---------------------------------------------------|-----------------------------|
| `ADMIN_PASSWORD`  | Mot de passe pour accéder à l'admin               | *(aucun, requis)*           |
| `SESSION_SECRET`  | Secret pour signer le cookie de session admin      | *(aucun, requis en prod)*   |
| `PORT`            | Port d'écoute HTTP                                | `3000`                      |
| `DATA_PATH`       | Chemin du fichier de stockage JSON                | `./data/data.json`          |

## Modèle de données

Stocké dans un unique fichier JSON (voir `src/dataStore.js` pour la couche
d'accès : lecture/écriture, génération d'id incrémental, suppression en
cascade) :

```json
{
  "salles": [
    { "id": 1, "nom": "Salle 204", "capacite": 30 }
  ],
  "classes": [
    { "id": 1, "nom": "BTS SIO 2" }
  ],
  "attributions": [
    { "id": 1, "classeId": 1, "salleId": 1, "jourSemaine": null }
  ]
}
```

Une classe a une attribution "par défaut" (`jourSemaine = null`) et,
optionnellement, une ou plusieurs surcharges par jour qui écrasent le défaut
ce jour-là uniquement.

## API

Public (lecture libre) :
- `GET /api/classes` — liste des classes
- `GET /api/classes/:id/salle` — salle courante (uniforme ou détail par jour)

Auth :
- `POST /api/auth/login` `{ password }`
- `POST /api/auth/logout`
- `GET /api/auth/check`

Admin (nécessite d'être connecté) :
- `GET/POST/PUT/DELETE /api/admin/salles[/:id]`
- `GET/POST/PUT/DELETE /api/admin/classes[/:id]`
- `GET /api/admin/classes/:id/attributions`
- `PUT /api/admin/classes/:id/attribution` `{ salle_id, jour_semaine }`
- `DELETE /api/admin/classes/:id/attribution?jour=mardi`

## Déploiement (Docker / Dokploy)

```bash
docker compose up -d --build
```

Le conteneur écoute sur le port `3000` et persiste `data.json` dans le
volume nommé `salle_data` (monté sur `/app/data`).

Sur Dokploy :
1. Créer une application "Docker Compose" pointant vers ce repo.
2. Définir les variables d'environnement `ADMIN_PASSWORD` et `SESSION_SECRET`
   dans l'onglet Environnement de Dokploy (elles sont lues par
   `docker-compose.yml`).
3. Déployer — le volume `salle_data` conserve les données entre les mises à
   jour.

⚠️ Le conteneur doit tourner en une seule instance (pas de scaling
horizontal) : le fichier `data.json` est réécrit en entier à chaque
modification et n'est pas prévu pour des écritures concurrentes venant de
plusieurs instances. Largement suffisant pour ce cas d'usage (une école,
très peu d'écritures, un seul admin).
