# Gestion des Congés & RH

Système RH de suivi des soldes de congés : acquisition, soldes négatifs,
récupération de jours, dépassements et régularisation des absences.

React 19 + TypeScript + Vite, avec Cloud Firestore et Firebase Authentication.

## Démarrage

```bash
bun install
bun run dev          # http://localhost:3000
```

Autres commandes :

| Commande               | Rôle                                       |
| ---------------------- | ------------------------------------------ |
| `bun run typecheck`    | Vérification TypeScript (mode strict)      |
| `bun run lint`         | ESLint                                     |
| `bun run format`       | Prettier (écriture)                        |
| `bun run test`         | Tests unitaires (Vitest)                   |
| `bun run verify`       | typecheck + lint + tests                   |
| `bun run build`        | Build de production                        |

## Contrôle d'accès

L'application contient des données RH confidentielles. Rien n'est lisible sans
être authentifié.

Trois rôles, stockés dans le document `users/{uid}` :

| Rôle          | Droits                                                        |
| ------------- | ------------------------------------------------------------- |
| `PENDING`     | Aucun accès aux données. État initial de tout nouveau compte.  |
| `HR Manager`  | Lecture/écriture des employés et des congés.                   |
| `ADMIN`       | Idem, plus la gestion des utilisateurs et la purge de la base. |

Une inscription ne donne aucun droit : le compte est créé en `PENDING` et un
administrateur lui attribue un rôle depuis l'onglet **Utilisateurs**. Cette
règle est appliquée côté serveur dans `firestore.rules`, pas seulement dans
l'interface — un client ne peut pas se promouvoir lui-même.

### Créer le premier administrateur

Les règles empêchent volontairement de s'auto-attribuer le rôle `ADMIN`. Le
premier admin se crée donc à la main, une seule fois :

1. Lancer l'application et créer un compte via **Créer un compte**.
2. Ouvrir la console Firebase → Firestore → collection `users`.
3. Sur le document correspondant à ce compte, remplacer `role: "PENDING"` par
   `role: "ADMIN"`.
4. Se reconnecter. Les comptes suivants se valident depuis l'application.

### Déployer les règles

Les règles de sécurité ne s'appliquent qu'une fois publiées :

```bash
firebase deploy --only firestore:rules
```

## Calcul des soldes

Deux cycles d'acquisition, dans `src/features/leave/vacationCalc.ts`. Les droits
s'acquièrent sur les **jours effectivement travaillés** : le mois de congé du
cycle n'ouvre pas lui-même de nouveaux droits.

| Contrat    | Cycle     | Travail ouvrant droit | Taux quotidien          |
| ---------- | --------- | --------------------- | ----------------------- |
| **TYPE_A** | 6 mois    | 5 mois (152,5 j)      | `30 / 152.5` ≈ 0,1967 j |
| **TYPE_B** | 12 mois   | 11 mois (335 j)       | `30 / 335` ≈ 0,0896 j   |

`jours travaillés = jours depuis l'embauche − congés payés pris − congés sans
solde`. Le solde vaut `(jours acquis + récupérations) − congés payés pris`. Un
solde négatif est signalé comme dette, accompagné du nombre de jours de travail
nécessaires pour la résorber.

Les congés maladie, paternité, mariage et décès n'entament pas le solde de
congés payés **et** continuent d'ouvrir des droits ; les congés payés et les
congés sans solde suspendent l'acquisition.

## Import Excel

L'import accepte `.xlsx`, `.xls`, `.ods`, `.csv` et `.tsv`, et reconnaît les
en-têtes de colonnes par correspondance approximative (accents et ponctuation
ignorés).

Une date d'embauche illisible **rejette la ligne** au lieu de lui substituer une
valeur par défaut : cette date détermine tout le calcul d'acquisition, une
substitution silencieuse fausserait durablement le solde de l'employé.

## Journal d'audit

Les actions sensibles sont écrites dans la collection `audit_logs` avec
l'identité de leur auteur. Cette collection est en ajout seul : les règles
interdisent toute modification ou suppression, y compris aux administrateurs.

## Sécurité

- `firestore.rules` est la véritable frontière de sécurité. Toute modification
  doit être relue puis redéployée.
- La clé API Firebase présente dans `firebase-applet-config.json` est un
  identifiant public, pas un secret — c'est le comportement documenté par
  Google. La protection vient des règles et de l'authentification.
- Supprimer un utilisateur dans l'application révoque son accès aux données mais
  ne supprime pas son compte d'authentification : le faire aussi dans la console
  Firebase pour empêcher toute reconnexion.
