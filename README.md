# 🌐 DDNS Admin - Cloudflare Dynamic DNS

Interface d'administration moderne pour gérer automatiquement vos enregistrements DNS Cloudflare avec détection de changement d'IP.

![Next.js](https://img.shields.io/badge/Next.js-15.3-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![Prisma](https://img.shields.io/badge/Prisma-6.x-2D3748?logo=prisma)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-38B2AC?logo=tailwindcss)

## ✨ Fonctionnalités

- 🔐 **Authentification sécurisée** - Protection par mot de passe avec JWT
- 🔄 **DDNS automatique** - Mise à jour DNS Cloudflare lors d'un changement d'IP
- 🌍 **Multi-API IP** - Consensus via 8 APIs pour une détection fiable
- 📊 **Dashboard moderne** - Interface responsive avec mode sombre
- 📝 **Logs détaillés** - Historique complet des changements et actions
- 🔔 **Notifications** - Discord et Telegram
- ⚙️ **Configurable** - Intervalles, vérifications, rétention des logs

## 🚀 Installation

### Prérequis

- Node.js 18+
- npm, yarn ou pnpm

### 1. Cloner le projet

```bash
git clone https://github.com/votre-username/cloudflare-ddns-admin.git
cd cloudflare-ddns-admin
```

### 2. Installer les dépendances

```bash
pnpm install
# ou
npm install
```

### 3. Configurer l'environnement

```bash
cp env.example .env
```

Éditez `.env` et configurez au minimum :

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="votre-clé-secrète-sécurisée"
```

> ⚠️ **Important** : Changez `JWT_SECRET` avec une clé aléatoire sécurisée !
> ```bash
> # Générer une clé
> openssl rand -base64 32
> ```

### 4. Initialiser la base de données

```bash
npx prisma db push
```

### 5. Lancer l'application

```bash
# Développement
pnpm dev

# Production
pnpm build
pnpm start
```

## 🔑 Connexion

- **Mot de passe par défaut** : `admin`
- Changez-le dans **Options > Mot de passe** après la première connexion

## ⚙️ Configuration

### Cloudflare

1. Allez dans l'onglet **Config**
2. Renseignez :
   - **API Token** : Token avec permissions DNS ([créer un token](https://dash.cloudflare.com/profile/api-tokens))
   - **Zone ID** : ID de votre domaine (visible dans le dashboard Cloudflare)
   - **Record Name** : Sous-domaine à mettre à jour (ex: `home.example.com`)
3. Configurez l'intervalle de vérification (en secondes)
4. Sauvegardez

### Notifications (optionnel)

#### Discord
1. Créez un webhook dans votre serveur Discord
2. Activez Discord dans l'onglet **Notifs**
3. Collez l'URL du webhook

#### Telegram
1. Créez un bot avec [@BotFather](https://t.me/BotFather)
2. Obtenez votre Chat ID avec [@userinfobot](https://t.me/userinfobot)
3. Activez Telegram et renseignez le token et chat ID

## 📁 Structure

```
├── app/                    # Routes Next.js App Router
│   ├── api/               # Routes API
│   ├── login/             # Page de connexion
│   └── page.tsx           # Dashboard principal
├── components/            # Composants React
├── lib/                   # Utilitaires
│   ├── ddns.ts           # Logique DDNS principale
│   ├── auth.ts           # Authentification
│   └── prisma.ts         # Client Prisma
├── prisma/               # Schémas base de données
└── public/               # Assets statiques
```

## 🗄️ Base de données

### SQLite (par défaut)

Parfait pour une utilisation personnelle.

```env
DATABASE_URL="file:./dev.db"
```

### PostgreSQL

Pour la production ou plusieurs instances.

```bash
cp prisma/schema.postgresql.prisma prisma/schema.prisma
```

```env
DATABASE_URL="postgresql://user:password@localhost:5432/ddns_admin"
```

### MySQL / MariaDB

```bash
cp prisma/schema.mysql.prisma prisma/schema.prisma
```

```env
DATABASE_URL="mysql://user:password@localhost:3306/ddns_admin"
```

Puis : `npx prisma db push`

## 🔧 Scripts

| Commande | Description |
|----------|-------------|
| `pnpm dev` | Développement avec hot-reload |
| `pnpm build` | Build de production |
| `pnpm start` | Lancer en production |
| `pnpm db:push` | Appliquer le schéma Prisma |
| `pnpm db:studio` | Interface graphique BDD |

## 🌐 APIs de détection d'IP

Le système utilise 8 APIs pour un consensus fiable :

| API | Type |
|-----|------|
| ipify | JSON |
| ip-api | JSON |
| ipwhois | JSON |
| ifconfig.me | Text |
| icanhazip | Text |
| wtfismyip | JSON |
| httpbin | JSON |
| Cloudflare 1.1.1.1 | Text |

Une IP est validée si **≥50% des APIs** sont d'accord avec **≥3 réponses identiques**.

## 📱 Captures d'écran

### Dashboard
- Vue d'ensemble avec statut du worker
- Diagnostic IP avec résultats multi-API
- Historique des changements d'IP avec logs détaillés

### Fonctionnalités
- 🌙 Mode sombre/clair
- 📱 Responsive mobile
- 👁️ Masquage des IPs sensibles
- 🗑️ Suppression des logs

## 🔒 Sécurité

- Mots de passe hashés avec bcrypt
- Tokens JWT avec expiration configurable
- Cookies HttpOnly et Secure
- Protection contre les requêtes multiples

## 📄 Licence

MIT License - voir [LICENSE](LICENSE)

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

---

Développé avec ❤️ et [Next.js](https://nextjs.org)
