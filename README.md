# 🎀 Desktop Mate

Un compagnon virtuel 3D autonome pour votre bureau Windows. Une waifu animée qui vit sa vie sur votre écran !

![Electron](https://img.shields.io/badge/Electron-28.0.0-47848F?logo=electron)
![Three.js](https://img.shields.io/badge/Three.js-0.160.0-black?logo=three.js)
![License](https://img.shields.io/badge/License-MIT-green)

## ✨ Fonctionnalités

- 🧠 **Entièrement autonome** - Elle décide seule de ses actions
- 🚶 **Se balade** sur le bureau
- 🪑 **S'assoit** sur les fenêtres et la barre des tâches
- 👋 **Salue** de temps en temps
- 🥱 **Bâille** quand elle est fatiguée
- 👀 **Suivi du regard** dynamique
- 🖱️ **Déplaçable** à la souris

## 🚀 Installation rapide

### Prérequis
- [Node.js](https://nodejs.org/) (v18 ou supérieur)
- Windows 10/11

### Étapes

```bash
# 1. Cloner le repo
git clone https://github.com/AmazonIPrime/zizitoun.git
cd zizitoun

# 2. Installer les dépendances
npm install

# 3. Lancer l'application
npm start
```

C'est tout ! 🎉

## 🧠 Comportement autonome

Le personnage est **entièrement autonome** ! Elle va :
- 🚶 Se balader sur votre bureau
- 🪑 S'asseoir sur vos fenêtres ou la barre des tâches
- 👋 Saluer de temps en temps
- 🥱 Bâiller quand elle est fatiguée
- 👀 Suivre du regard

**Interactions :**
- **Double-clic** sur elle → Elle salue
- **Glisser** → Déplacer le personnage

## 🛠️ Commandes

```bash
# Lancer en mode développement (avec DevTools)
npm run dev

# Lancer normalement
npm start

# Construire l'exécutable
npm run build
```

## 📁 Structure du projet

```
desktop-mate/
├── main.js           # Process principal Electron
├── renderer.js       # Rendu 3D et logique principale
├── preload.js        # Bridge IPC
├── index.html        # Interface
├── styles.css        # Styles
├── animations/       # Modules d'animation
│   ├── brain.js      # IA de comportement
│   ├── walk.js       # Animation de marche
│   ├── sit.js        # Animation assise
│   ├── wave.js       # Animation salut
│   ├── yawn.js       # Animation bâillement
│   └── ...
├── assets/           # Modèle VRM
└── scripts/          # Scripts PowerShell
```

## 📜 Licence

MIT - Faites-en ce que vous voulez !

---

*Made with ❤️ for the community*
