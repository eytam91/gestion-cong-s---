# Système de Gestion des Congés & Absences RH

Application moderne et sécurisée de gestion des ressources humaines, spécialisée dans le suivi des droits à congés, soldes de congés, soldes négatifs (dettes), régularisation des absences et conformité des contrats locaux et expatriés.

---

## 🌟 Fonctionnalités Clés

### 1. Authentification & Gestion des Rôles (RBAC)
- **Authentification Firebase** : Connexion par identifiant/mot de passe (format nom d'utilisateur ou email) et connexion Google en un clic.
- **Système à 3 niveaux de rôles** :
  - **ADMIN** : Accès complet, gestion des utilisateurs et promotion de rôles, suppression d'employés, outils de maintenance et audit de sécurité.
  - **HR Manager** : Consultation des fiches collaborateurs, saisie et validation des congés, simulateur de congés, consultation de l'historique.
  - **PENDING** : Tout nouvel utilisateur créé reste en attente d'approbation via l'écran sécurisé `Gate` jusqu'à validation par un administrateur.
- **Attribution automatique du premier compte** : Le tout premier compte créé ou les comptes administrateurs définis sont promus `ADMIN` automatiquement.

### 2. Journalisation d'Audit Résiliente (Cloud Firestore)
- Tous les événements sensibles (connexions, modifications, créations, suppressions, changements de rôle, imports Excel) sont enregistrés dans la collection `audit_logs` de Firestore.
- Traçabilité complète avec l'acteur (`AuditActor` : `uid`, `name`, `email`, `role`), l'appareil (`deviceId`, `platform`, `deviceType`) et l'horodatage ISO.
- Exécution asynchrone non-bloquante : un échec réseau d'audit ne bloque jamais l'opération utilisateur en cours.
- Export CSV complet du journal d'activité pour conformité réglementaire.

### 3. Gestion Complète des Employés
- Recherche multi-critères instantanée et insensible aux accents sur :
  - **Nom de famille**
  - **Prénom**
  - **Matricule RH & Matricule GL/Société**
- Fiches individuelles détaillées avec calcul automatique de l'ancienneté, solde acquis, jours pris, solde restant et alertes de dépassement.
- Importation & Exportation Excel / CSV compatibles avec les formats SIRH.

### 4. Moteur de Calcul des Congés
- Prise en charge des statuts **Personnel Local (LOCAL)** et **Personnel Expatrié (EXPAT)**.
- Gestion des contrats de rotation :
  - **Type A** : 5 mois de service + 1 mois de congé (2,5 jours/mois).
  - **Type B** : 11 mois de service + 1 mois de congé (2,5 jours/mois).
- Suivi des soldes négatifs avec alertes visuelles et simulateur de projection de date de retour en solde positif.

---

## 🏗️ Architecture & Technologies

- **Frontend** : React 19, TypeScript, Tailwind CSS, Lucide React, Recharts
- **Bundler & Dev Server** : Vite 6
- **Base de Données & Auth** : Google Firebase (Firebase Authentication & Cloud Firestore)
- **Tests** : Vitest (tests unitaires sur les calculs de congés et parsing Excel)
- **Qualité de code** : ESLint, Prettier, GitHub Actions CI

---

## 🚀 Installation & Démarrage

### Prérequis
- [Node.js](https://nodejs.org/) version 20 ou supérieure
- [npm](https://www.npmjs.com/) version 9 ou supérieure

### 1. Cloner le projet et installer les dépendances
```bash
git clone https://github.com/eytam91/gestion-cong-s---.git
cd gestion-cong-s---
npm install
```

### 2. Configuration Firebase
Copiez le fichier d'exemple et renseignez vos clés Firebase :
```bash
cp .env.example .env
```

Dans la console Firebase :
1. Activez **Authentication** avec les fournisseurs :
   - **Adresse e-mail/Mot de passe**
   - **Google**
2. Activez **Cloud Firestore** en mode production.
3. Déployez les règles de sécurité `firestore.rules`.

### 3. Démarrer le serveur de développement
```bash
npm run dev
```
L'application est accessible sur [http://localhost:3000](http://localhost:3000).

---

## 🧪 Tests & Qualité de Code

### Lancer les tests unitaires
```bash
# Exécution ponctuelle
npm test

# Mode watch interactif
npm run test:watch
```

### Vérification TypeScript & Linting
```bash
npm run lint
npm run lint:eslint
```

### Formatage du code
```bash
# Vérifier la conformité Prettier
npm run format:check

# Appliquer le formatage automatique
npm run format
```

### Build de Production
```bash
npm run build
npm start
```

---

## 🔒 Règles de Sécurité Firestore (`firestore.rules`)

Les règles appliquent le principe de moindre privilège :
- **Utilisateurs (`/users/{userId}`)** : Chaque utilisateur ne peut lire et modifier que son propre profil. Seul un administrateur peut modifier les rôles (`ADMIN`, `HR Manager`, `PENDING`) ou supprimer des profils.
- **Employés (`/employees/{employeeId}`)** : Lecture autorisée pour les membres de l'équipe RH (`ADMIN` et `HR Manager`). Création, modification et suppression réservées exclusivement aux `ADMIN`.
- **Congés (`/leave_records/{leaveId}`)** : Lecture et écriture autorisées pour l'équipe RH (`ADMIN` et `HR Manager`).
- **Journal d'Audit (`/audit_logs/{logId}`)** : Append-only (création autorisée), lecture restreinte au staff, toute modification ou suppression est strictement interdite.
- **Utilisateurs PENDING** : Aucun accès aux collections métier (`employees`, `leave_records`, `audit_logs`).

---

## 📄 Licence

Application interne de gestion des ressources humaines. Tous droits réservés.
