# ROADMAP

## Vision

Teams Role Notifier a pour objectif de devenir la solution de référence pour envoyer automatiquement des notifications Microsoft Teams depuis Monday.com.

L'objectif n'est pas uniquement d'envoyer des messages Teams, mais de fournir une plateforme de notification flexible, adaptable à tous les métiers et à toutes les organisations.

---

# Version 1.1

## Configuration hybride

Permettre de choisir les destinataires directement dans une automatisation.

Priorité :

* Destinataire principal
* Colonnes CC

avec conservation de la configuration du board comme valeur par défaut.

### Fonctionnement

Si une colonne est renseignée dans l'automatisation :

→ elle est utilisée.

Sinon :

→ la configuration du board est utilisée.

---

## Auteur réel de l'action

Le mode :

```txt
Auteur de l'action
```

est désormais disponible.

Améliorations prévues :

* suppression des variables techniques (`ACTOR`)
* récupération automatique de l'auteur
* compatibilité avec un maximum de déclencheurs Monday

---

## Templates intelligents

Ajouter automatiquement des variables enrichies :

```text
{creator.name}
{creator.email}
{board.name}
{group.title}
{status.label}
```

sans que l'utilisateur ait à connaître les variables Monday.

---

# Version 1.2

## Centre de diagnostic

Créer une page permettant de visualiser :

* dernière automation exécutée
* expéditeur
* destinataires
* message envoyé
* erreurs éventuelles

---

## Vérification Microsoft

Afficher :

```text
Utilisateur connecté
Utilisateur non connecté
Dernière connexion
Refresh Token valide
```

---

## Historique

Conserver un historique des notifications.

Exemple :

```text
01/07/2026
14:05

Status changed

Auteur :
Mickaël

Destinataires :
Support
Chef de projet

Statut :
Envoyé
```

---

## Expérience utilisateur

Ajouts prévus :

* compteur de destinataires
* aperçu du message
* validation de la configuration
* messages d'erreur plus explicites

---

# Version 1.3

## Administration

Créer une interface permettant de gérer :

* utilisateurs Microsoft connectés
* connexions expirées
* utilisateurs inactifs
* tableaux configurés

---

## Statistiques

Afficher :

* nombre de notifications envoyées
* utilisateurs actifs
* tableaux configurés
* erreurs

---

# Version 2.0

## Marketplace Monday

Publication officielle de l'application.

Prévoir :

* logo
* icône
* captures d'écran
* documentation
* politique de confidentialité
* support utilisateur

---

## Paramétrage avancé

Configuration directement dans les automatisations lorsque les capacités du Builder Monday le permettront.

Objectif :

```text
When status changes
→ Send Teams notification
to Intégrateur
cc Chef de projet
```

sans configuration préalable.

---

## Nouveaux canaux

Architecture prévue pour ajouter :

* Slack
* Outlook
* SMS
* WhatsApp
* Discord

sans modifier la logique métier.

---

# Vision long terme

Faire de Teams Role Notifier une plateforme de notifications d'entreprise permettant de choisir :

* le canal
* les destinataires
* les modèles
* les règles d'envoi

indépendamment de Monday.com.

L'application devra rester :

* simple à utiliser ;
* flexible ;
* maintenable ;
* compatible avec l'évolution des tableaux Monday.com.
