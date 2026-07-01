# CHANGELOG

Toutes les évolutions importantes de **Teams Role Notifier** sont documentées dans ce fichier.

---

# Version 1.0.0 – Première version fonctionnelle

## Nouveautés

### Authentification Microsoft

* Authentification Microsoft 365 (OAuth 2.0)
* Connexion individuelle de chaque utilisateur
* Stockage sécurisé des Refresh Tokens
* Envoi des notifications Teams au nom de l'utilisateur connecté

### Notifications Teams

* Envoi de messages privés Microsoft Teams
* Création automatique du chat privé si nécessaire
* Support du format HTML
* Liens Monday cliquables
* Bouton **Envoyer un test**

### Configuration par tableau

Ajout de la vue **Teams Notifications** permettant de configurer :

* Mode expéditeur
* Colonne expéditeur
* Colonne destinataire principal
* Colonnes CC
* Bibliothèque de modèles
* Template personnalisé

Configuration sauvegardée par tableau.

### Destinataires

* Destinataire principal
* Plusieurs colonnes CC
* Suppression automatique des doublons
* Pas d'envoi à soi-même

### Expéditeur

Deux modes disponibles :

* Colonne configurée
* Auteur de l'action (avec repli automatique sur la colonne configurée si l'utilisateur n'a pas connecté Microsoft)

### Bibliothèque de modèles

Ajout des modèles :

* 📋 Item créé
* 💬 Nouveau commentaire
* 🔄 Changement de statut
* 📝 Modification de colonne
* 🧩 Statut de sous-élément

### Déclencheurs supportés

* Item created
* Status changed
* Column changed
* Update created
* Person assigned
* Date arrives
* Subitem created
* Subitem status changed

### Sécurité

* Protection contre les doubles exécutions Monday (`actionUuid`)
* Vérification des destinataires
* Vérification de l'expéditeur
* Repli automatique si l'auteur de l'action n'a pas connecté Microsoft

---

# Version 1.0.1

## Corrections

* Correction de l'envoi multiple provoqué par les nouvelles tentatives de Monday
* Correction de l'envoi à soi-même
* Amélioration de l'extraction de l'adresse e-mail de l'auteur de l'action
* Amélioration des messages d'erreur
* Nettoyage des logs de débogage

---

# Limitations connues

## Déclencheur "When an item is created"

Les colonnes People peuvent ne pas être encore renseignées au moment où l'automatisation se déclenche.

Dans ce cas, il est recommandé d'utiliser plutôt :

* When person is assigned
* When status changes
* When update created

---

# Feuille de route

## Version 1.1

* Configuration des destinataires directement dans les automatisations (Board + Colonnes People)
* Utilisation prioritaire des colonnes définies dans l'automatisation
* Utilisation de la configuration du tableau comme valeur par défaut
* Suppression progressive des variables techniques (`ACTOR`, `Item's link`) dans les messages

## Version 1.2

* Tableau de diagnostic
* Historique des notifications
* Vérification des connexions Microsoft
* Centre d'administration des utilisateurs

## Version 2.0

* Publication Marketplace
* Paramétrage avancé des automatisations
* Support d'autres canaux de notification (Slack, Outlook, SMS, etc.)
