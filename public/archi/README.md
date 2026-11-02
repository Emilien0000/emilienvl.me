# QCM Architecture des Réseaux

Mini-site statique de révision (OSI · TCP/IP · Routage · Adressage).

- `index.html` : QCM de 30 questions tirées au hasard dans `questions.js` (ordre des réponses mélangé, questions déjà vues évitées, erreurs qui reviennent, historique et courbe de notes en `localStorage`)
- `revision.html` : **mode révision**, qui travaille le rappel actif plutôt que la reconnaissance
  - 🃏 Flashcards avec répétition espacée (Leitner, 5 boîtes : 1, 3, 7, 14, 30 jours)
  - ✍️ QCM à rappel libre (tu réponds de tête avant de voir les 4 choix)
  - 🧮 Calculs IP générés au hasard (réseau, broadcast, hôtes, masque, préfixe)
  - 📋 Tableaux à compléter de mémoire (OSI/TCP-IP/PDU, TCP vs UDP, ports…)
  - 🔀 Remettre dans l'ordre (couches OSI, encapsulation, DORA…)
  - 🧱 Jeu des couches : empiler visuellement OSI, aligner TCP/IP en face, puis ajouter les PDU (3 niveaux, glisser-déposer ou clic)
- `style.css` et `questions.js` sont partagés par les deux pages

## Publier
Le site est servi sur `/archi/` : pousse les 5 fichiers (`index.html`, `revision.html`, `style.css`, `questions.js`, `README.md`) dans ce dossier. Les chemins des pages sont absolus (`/archi/style.css`, `/archi/questions.js`).

## Ajouter des questions
Dans `questions.js`, ajoute une ligne (le niveau de priorité va de 0 à 4) :
`["Cours", "Question", "Bonne réponse", "Faux 1", "Faux 2", "Faux 3", "Source", 2],`
