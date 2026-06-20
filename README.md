# AFRICRM Shop

Application de caisse moderne destinée aux boutiques, PME et PMI, conçue au
Sénégal par AFRICRM.

## Prérequis

- Node.js 24 LTS (la version attendue est indiquée dans `.nvmrc`)
- npm 11+
- Git
- Un projet Supabase

## Démarrage local

```bash
npm install
copy .env.example .env.local
npm run dev
```

Ouvrir ensuite [http://localhost:3000](http://localhost:3000).

Dans `.env.local`, remplacer la valeur de
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` par la clé publique disponible dans
**Supabase > Project Settings > API**. Ne jamais utiliser la clé `service_role`
dans une variable commençant par `NEXT_PUBLIC_`.

## Commandes utiles

```bash
npm run dev          # serveur de développement
npm run lint         # règles de qualité ESLint
npm run typecheck    # vérification TypeScript
npm run test         # tests automatisés
npm run build        # compilation de production
npm run check        # exécute tous les contrôles ci-dessus
npm run format       # formate le code
```

## Socle technique

- Next.js 16, React 19, TypeScript strict et Tailwind CSS 4
- Supabase SSR et client JavaScript
- TanStack Query pour les données distantes
- React Hook Form et Zod pour les formulaires
- Zustand pour l’état local, notamment le futur panier
- Radix UI, Lucide et Sonner pour une interface accessible
- Vitest et Testing Library pour les tests

La base de données sera créée et maintenue avec des scripts SQL exécutés dans
le SQL Editor de Supabase. Les scripts versionnés seront ajoutés au projet au
fur et à mesure des modules.
