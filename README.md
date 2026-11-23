# 10x — journal quotidien par volets

Application personnelle pour noter chaque journée sur plusieurs volets (spirituel, sportif,
professionnel, santé, famille, apprentissage…). Chaque volet contient des habitudes notées
individuellement ; un score pondéré est calculé par volet puis pour la journée entière.

- **Cible** : iPhone (testé au format 15 Pro Max), installée sur l'écran d'accueil.
- **Hors-ligne** : aucune connexion n'est nécessaire à l'usage. Les données restent sur le
  téléphone (IndexedDB) ; aucun serveur, aucun compte.
- **Export** : CSV détaillé, CSV récapitulatif, XML et sauvegarde JSON réimportable.
- **Développement** : entièrement dans Docker, aucun Node à installer sur Windows.

## Démarrer

```powershell
docker compose up dev
```

Puis ouvrir <http://localhost:5273>. Le port hôte est configurable (5173 est souvent déjà pris) :

```powershell
$env:DEV_PORT=5300; docker compose up dev
```

### Tester depuis l'iPhone sur le Wi-Fi local

1. Relever l'IP du PC : `ipconfig` (par exemple `192.168.1.20`).
2. Démarrer en indiquant cette IP, pour que le rechargement à chaud fonctionne :

```powershell
$env:HMR_HOST="192.168.1.20"; docker compose up dev
```

3. Ouvrir `http://192.168.1.20:5273` dans Safari. Autoriser le port dans le pare-feu Windows si
   la page ne s'affiche pas.

## Commandes

| Action | Commande |
|---|---|
| Tests (logique de score et d'export) | `docker compose run --rm dev npm run test` |
| Build de production | `docker compose run --rm dev npm run build` |
| Aperçu du build (service worker actif) | `docker compose up preview` → <http://localhost:4273> |
| Régénérer les icônes | `docker compose run --rm dev npm run icons` |

## Installer sur l'iPhone

Safari n'autorise l'ajout à l'écran d'accueil d'une PWA installable qu'en **HTTPS**. Deux voies :

**A. GitHub Pages (recommandé).** Le workflow [`deploy.yml`](.github/workflows/deploy.yml)
teste, construit et déploie à chaque push sur `main`.

> **Activation, une seule fois** : dépôt → *Settings* → *Pages* → *Build and deployment* →
> *Source* : **GitHub Actions**. Le dépôt doit être **public**, sauf abonnement GitHub Pro.
> Cette étape ne peut pas être automatisée : le `GITHUB_TOKEN` du workflow n'a pas le droit de
> créer le site (`Resource not accessible by integration`).

Le site est ensuite servi sur `https://<utilisateur>.github.io/<dépôt>/`. Le workflow passe
`BASE_PATH=/<dépôt>/` au build, ce qui est indispensable : sans cela les assets, le manifeste
et le service worker seraient cherchés à la racine du domaine. Pour reproduire ce build en
local :

```powershell
docker compose run --rm -e BASE_PATH=/10x/ dev npm run build
```

Ouvrir ensuite l'adresse dans Safari, puis *Partager → Sur l'écran d'accueil*. Un seul accès
internet, le temps de l'installation : ensuite le service worker sert tout depuis le cache et
l'app fonctionne en mode avion.

**B. Tout local.** Servir `dist/` en HTTPS sur le réseau local avec un certificat `mkcert`, et
installer le certificat racine comme profil de confiance sur l'iPhone (Réglages → Général →
VPN et gestion de l'appareil, puis Général → Informations → Confiance certificats). Aucune
dépendance externe, mais plus de manipulations.

### Rappel quotidien

iOS ne permet pas à une PWA de programmer une notification locale sans serveur push. Le rappel
se met en place côté téléphone, sans internet :

> App Raccourcis → Automatisation → Heure de la journée → 21 h 00, tous les jours →
> Action « Ouvrir l'app » → 10x → désactiver « Demander avant d'exécuter ».

## Modèle de score

- **Habitude** : *fait / pas fait* (0 ou 1), *note 0 à 5* (`note / 5`), ou *quantité vs objectif*
  (`valeur / objectif`, plafonné à 100 %).
- **Volet** : moyenne des taux de ses habitudes, pondérée par le poids de chaque habitude.
- **Journée** : moyenne des scores de volets, pondérée par le poids de chaque volet. Un volet
  sans habitude active est exclu du calcul.
- Une habitude non renseignée compte 0 mais reste signalée comme telle (tiret au lieu d'un
  pourcentage) : « pas fait » et « pas saisi » ne se confondent pas à la lecture.

Les poids, volets, habitudes et objectifs se modifient dans l'onglet **Réglages**.

## Sauvegardes

Les données vivent uniquement dans le navigateur du téléphone. Une PWA installée sur l'écran
d'accueil n'est pas soumise à la purge Safari des sept jours d'inactivité, mais une
réinitialisation de l'appareil ou une suppression de l'app efface tout.

**Exporter la sauvegarde JSON régulièrement** (onglet Données → Sauvegarde JSON → AirDrop vers
le PC). La restauration se fait par le même onglet et remplace l'intégralité des données.

## Structure

```
src/
├─ domain/     logique pure, testée : scoring.ts, export.ts, types.ts
├─ db/         Dexie (schema.ts), requêtes (queries.ts), hooks React, sauvegarde
├─ components/ ScoreRing, CategoryCard, HabitRow
└─ pages/      Today, History, Settings, Data
tests/         Vitest sur la logique pure
scripts/       génération des icônes PNG (sans dépendance)
```

## Évolution vers une app native

Le code React peut être emballé par **Capacitor** en application iOS native (notifications
locales, widget, App Store) le jour où un Mac ou un compte Apple Developer est disponible,
sans réécriture de l'interface ni du modèle de données.
