# ARCHITECTURE

# Teams Role Notifier

## Objectif

Teams Role Notifier permet d'envoyer automatiquement des notifications Microsoft Teams depuis Monday.com.

L'application est conçue pour être :

* indépendante de la structure des tableaux ;
* configurable par board ;
* compatible avec différents scénarios d'automatisation ;
* extensible à d'autres canaux de notification.

---

# Architecture générale

```text
Monday Automation
        │
        ▼
execute-action
        │
        ▼
Lecture des données Monday
        │
        ▼
Configuration du board
        │
        ▼
Calcul des destinataires
        │
        ▼
Microsoft Graph
        │
        ▼
Microsoft Teams
```

---

# Structure du projet

```text
app/

├── api/
│   ├── auth/
│   ├── config/
│   ├── execute-action/
│   ├── monday/
│   └── webhook/
│
└── config/

lib/

├── teams.ts
├── render-template.ts
```

À terme, la structure cible sera :

```text
lib/

graph.ts
monday.ts
teams.ts
templates.ts
render-template.ts
```

---

# Flux complet

## 1. Monday déclenche une automatisation

Exemple :

```text
When Status changes
→ Send Teams notification
```

Monday appelle :

```text
POST /api/execute-action
```

---

## 2. execute-action

Le fichier :

```text
app/api/execute-action/route.ts
```

est le cœur de l'application.

Il est responsable de :

* récupérer le payload Monday ;
* empêcher les doubles exécutions ;
* récupérer l'item ;
* récupérer la configuration ;
* calculer les destinataires ;
* construire le message ;
* envoyer la notification Teams.

---

## 3. Lecture des données Monday

L'application récupère :

* l'item ;
* le board ;
* le créateur ;
* les colonnes ;
* les utilisateurs.

Ces informations sont obtenues via l'API GraphQL Monday.

---

## 4. Configuration

Deux niveaux de configuration existent.

### Niveau 1

Configuration du board :

```text
Teams Notifications
```

Elle contient :

* mode expéditeur ;
* colonne expéditeur ;
* colonne destinataire ;
* colonnes CC ;
* modèle ;
* template.

Cette configuration est stockée dans :

```text
teams-config:{boardId}
```

dans Vercel KV.

---

### Niveau 2

Configuration de l'automatisation.

Lorsqu'une automation fournit :

* recipientColumn
* ccColumn

ces valeurs sont prioritaires.

Si elles sont absentes :

la configuration du board est utilisée.

---

# Expéditeur

Deux modes sont disponibles.

## 1. Colonne configurée

L'expéditeur est obtenu à partir de la colonne People sélectionnée.

---

## 2. Auteur de l'action

Le backend extrait l'adresse e-mail de l'auteur.

Si un Refresh Token Microsoft existe :

→ le message est envoyé en son nom.

Sinon :

→ l'application utilise automatiquement la colonne expéditeur configurée.

Ce mécanisme garantit qu'une notification peut toujours être envoyée.

---

# Destinataires

Les destinataires sont calculés dans cet ordre.

## Destinataire principal

Une colonne People.

---

## Colonnes CC

Une ou plusieurs colonnes People.

---

## Déduplication

Les doublons sont supprimés automatiquement.

---

## Auto-notification

L'application n'envoie jamais un message Teams à l'expéditeur lui-même.

---

# Microsoft Graph

L'application utilise Microsoft Graph pour :

* renouveler les Access Tokens ;
* rechercher les utilisateurs ;
* créer les chats privés ;
* envoyer les messages Teams.

---

# Authentification

Chaque utilisateur possède :

* un Refresh Token ;
* un Access Token renouvelé automatiquement.

Les Refresh Tokens sont stockés dans Vercel KV.

---

# Protection contre les doublons

Monday peut relancer plusieurs fois une même automation.

L'application utilise :

```text
actionUuid
```

pour éviter plusieurs envois.

Chaque action est enregistrée temporairement dans Vercel KV.

---

# Templates

Les messages sont générés via :

```text
render-template.ts
```

Les variables sont remplacées avant l'envoi.

Variables actuellement disponibles :

```text
{item.id}
{item.name}
{item.url}

{creator.name}
{creator.email}

{board.id}
{board.name}
{board.url}

{requester.name}
{integrator.name}
```

Cette liste pourra être enrichie au fil des versions.

---

# Bibliothèque de modèles

Les modèles disponibles sont :

* 📋 Item créé
* 💬 Nouveau commentaire
* 🔄 Changement de statut
* 📝 Modification de colonne
* 🧩 Statut de sous-élément

Ils constituent une base qui peut être personnalisée.

---

# Gestion des erreurs

Le backend contrôle :

* absence d'expéditeur ;
* absence de destinataire ;
* message vide ;
* utilisateur Microsoft non connecté ;
* action Monday déjà traitée.

Les erreurs sont journalisées afin de faciliter le diagnostic.

---

# Évolutions prévues

## Court terme

* configuration hybride (board + automation) ;
* enrichissement des templates ;
* amélioration des diagnostics.

## Moyen terme

* centre d'administration ;
* historique des notifications ;
* supervision des connexions Microsoft.

## Long terme

Architecture prévue pour supporter d'autres canaux :

* Microsoft Teams
* Slack
* Outlook
* SMS
* Discord

sans modifier la logique métier.

---

# Principes de conception

Le projet suit les principes suivants :

* une responsabilité par composant ;
* configuration sans code ;
* compatibilité avec tous les types de tableaux Monday ;
* priorité à la simplicité d'utilisation ;
* compatibilité ascendante des configurations.

L'objectif est de construire une plateforme de notification fiable, extensible et facilement maintenable.
