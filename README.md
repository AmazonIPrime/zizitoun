
##  Installation rapide

### Prérequis
- [Node.js](https://nodejs.org/) (v18 ou supérieur)
- Windows 10/11

### Étapes

```bash
#dans lprojet
npm install
npm start
```



## Commandes

```bash
npm run dev
npm start
npm run build
```

## Structure du projet

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

##  Licence

MIT - Faites-en ce que vous voulez !

---

*Made by N3tflyx pour la commu archeum tout les gens qui propsent des trucs comme ça font payer là c gratos open source et on peut tout en faire, malware, llms etc bisous*
