# Le défi : es-tu meilleur que le développeur ?

Sept tickets d'incident interactifs, inspirés de situations réelles de support N3. Le chrono tourne, les mauvais clics coûtent des points, et le dernier ticket demande d'écrire une fonction Python qui est réellement exécutée dans le navigateur.

Ce jeu est un extrait de mon portfolio. Il tient en trois fichiers (HTML, CSS, JavaScript), sans framework, sans dépendance à installer et sans étape de construction.

*English summary: seven interactive incident tickets (SharePoint, DNS, Odoo, Power Automate, SQL, outage diagnosis, Python). Plain HTML, CSS and JavaScript, bilingual French/English, no build step. The last ticket runs the player's Python code in the browser with Pyodide inside a Web Worker.*

## Les sept tickets

| N° | Thème | Niveau | Ce que le joueur doit faire |
|----|-------|--------|-----------------------------|
| 01 | SharePoint | Facile | Retrouver pourquoi une bibliothèque n'est plus visible et corriger les permissions sans donner trop de droits |
| 02 | DNS | Facile | Repérer l'enregistrement fautif d'une zone après un renouvellement de domaine et le corriger |
| 03 | Odoo | Moyen | Trouver dans un extrait de module la ligne qui fait sortir une facture sans TVA et choisir la correction |
| 04 | Power Automate | Moyen | Remettre les étapes d'un flux dans l'ordre et corriger l'étape mal configurée |
| 05 | SQL | Difficile | Corriger la requête d'un rapport plein de doublons ; le résultat obtenu est comparé au résultat attendu |
| 06 | Diagnostic | Expert | Lire un journal d'incident, isoler la cause racine d'une panne générale et choisir la bonne action |
| 07 | Python | Expert | Écrire une fonction de relance de factures impayées qui passe cinq tests |

Chaque ticket vaut 200 points, soit 1 400 au total. Un mauvais choix retire des points, un indice en coûte 50.

## Ce qu'il y a à lire dans le code

- **Un moteur de jeu minimal** (`js/defi.js`) : un tableau de tickets, un tableau d'énigmes qui savent chacune se dessiner, un état par partie, un chrono et un score. Ajouter un ticket revient à ajouter une entrée dans chaque tableau.
- **Du vrai Python dans le navigateur** : le ticket 07 charge l'interpréteur [Pyodide](https://pyodide.org) dans un Web Worker. Le code du joueur ne bloque donc jamais la page, et une boucle infinie est arrêtée au bout de 6 secondes en terminant le worker. Si l'interpréteur ne peut pas être téléchargé, une validation simplifiée prend le relais.
- **Des variantes aléatoires** : noms, adresses IP, heure de la panne, taux et seuils changent à chaque partie, et les valeurs attendues par les tests sont recalculées. Une réponse recopiée d'une partie précédente ne fonctionne pas.
- **Des garde-fous contre la triche facile** : copier, couper et coller sont désactivés dans la fenêtre de jeu, chaque ticket impose un délai minimal de lecture avant validation, et un score obtenu trop vite est marqué « à vérifier ».
- **Deux langues sans bibliothèque** (`js/i18n.js`) : le français est écrit dans la page, l'anglais vient d'un dictionnaire appliqué aux nœuds de texte. La langue suit `?lang=`, puis le choix mémorisé, puis la langue du navigateur.
- **Un classement local** : les cinq meilleurs scores sont gardés dans le `localStorage` du navigateur. Rien n'est envoyé à un serveur.

## Lancer le jeu

Le jeu est un site statique. N'importe quel serveur de fichiers suffit :

```bash
python -m http.server 8000
```

Puis ouvrir `http://localhost:8000`. Le ticket 07 a besoin d'une connexion à Internet la première fois, pour télécharger l'interpréteur Python (environ 10 Mo).

## Organisation

```
index.html        la page : présentation, liste des tickets, classement, fenêtre de jeu
css/style.css     les styles
js/i18n.js        la bascule français / anglais
js/defi.js        le moteur du jeu et les sept énigmes
images/           la photo du classement
```

## Limite connue

Tout se passe dans le navigateur : quelqu'un qui lit `js/defi.js` y trouve les réponses. C'est assumé. Le jeu sert à montrer comment je raisonne sur un incident, pas à faire passer un examen.

## Auteur

Daouda Dao, développeur full-stack et administrateur SharePoint, Microsoft 365 et Odoo à Ouagadougou.
[LinkedIn](https://linkedin.com/in/ddaouda-dao) · [GitHub](https://github.com/Twish15)
