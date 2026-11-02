# QCM LPWAN · LoRa · Sigfox

Mini-site statique de révision (cours de N. Dailly, UniLaSalle-Amiens).

- 90 questions (30 LPWAN, 30 LoRa, 30 Sigfox) dans `questions.js`
- Chaque QCM tire 30 questions au hasard ; l'ordre des réponses est mélangé
- Les questions déjà vues sont évitées (historique en `localStorage`)

## Publier sur GitHub Pages
1. Crée un dépôt et pousse ces 4 fichiers à la racine
2. Settings → Pages → Branch `main` / `/ (root)` → Save
3. Le site est dispo sur `https://<user>.github.io/<repo>/`

## Ajouter des questions
Dans `questions.js`, ajoute une ligne :
`["Cours", "Question", "Bonne réponse", "Faux 1", "Faux 2", "Faux 3", "Source"],`
