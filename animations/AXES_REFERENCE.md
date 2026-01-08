# VRM Bone Rotation Axes - Récapitulatif

Ce fichier documente les axes de rotation découverts pour les bones VRM humanoid.
Notre modèle est tourné de 180° (fait face à la caméra).

## 📋 Référence des Axes

### Configuration Globale VRM
- **Système de coordonnées** : Right-handed, Y-Up
- **T-Pose** : Personnage face à +Z
- **Notre modèle** : Tourné de 180° (face à -Z / caméra)

---

## 🦾 Bras Droit (Right Arm)

### `rightUpperArm` (Épaule → Coude)
| Axe | Direction | Valeur Type |
|-----|-----------|-------------|
| **X** | Négatif = Bras vers l'AVANT | -1.5 |
| **Y** | Rotation outward | +0.3 |
| **Z** | -1.2 = Bras le long du corps (idle), 0 = T-pose | -1.2 → -0.5 |

### `rightLowerArm` (Coude → Poignet)
| Axe | Direction | Valeur Type |
|-----|-----------|-------------|
| **X** | - | 0 |
| **Y** | Négatif = Plie le coude | -1.8 |
| **Z** | Torsion de l'avant-bras (orientation paume) | 0 |

### `rightHand` (Poignet)
| Axe | Direction | Valeur Type |
|-----|-----------|-------------|
| **X** | Rotation de la paume. Négatif = paume correcte | -1.9 |
| **Y** | Wave left-right (pour coucou) | oscillation |
| **Z** | Inclinaison latérale | 0 |

---

## 🦵 Jambe Gauche (Left Leg)

### `leftUpperLeg` (Hanche → Genou)
| Axe | Direction | Valeur Type |
|-----|-----------|-------------|
| **X** | Positif = Lever la jambe vers l'avant | +0.3 |
| **Y** | - | 0 |
| **Z** | Positif = Écarter vers l'extérieur | +0.1 |

### `leftLowerLeg` (Genou → Cheville)
| Axe | Direction | Valeur Type |
|-----|-----------|-------------|
| **X** | Négatif = Plier le genou | -0.8 |
| **Y** | - | 0 |
| **Z** | - | 0 |

---

## 🗣️ Tête (Head)

### `head`
| Axe | Direction | Valeur Type |
|-----|-----------|-------------|
| **X** | Hocher la tête (oui) | ±0.3 |
| **Y** | Tourner la tête gauche/droite | ±0.5 |
| **Z** | Pencher la tête (kawaii tilt) | +0.15 |

---

## 🖐️ Doigts (Fingers)

### `right[Finger]Proximal` (Index, Middle, Ring, Little, Thumb)
| Axe | Direction | Valeur Type |
|-----|-----------|-------------|
| **X** | Plier le doigt | - |
| **Y** | - | 0 |
| **Z** | Écarter les doigts | ±0.1 |

---

## 📐 Valeurs de Référence

### Pose Idle
```javascript
rightUpperArm.rotation.set(0, 0, -1.2);  // Bras le long du corps
rightLowerArm.rotation.set(0, 0, -0.1);
leftUpperArm.rotation.set(0, 0, 1.2);    // Miroir pour bras gauche
leftLowerArm.rotation.set(0, 0, 0.1);
```

### Animation Wave (Coucou)
```javascript
rightUpperArm.rotation.set(-1.5, 0.3, -0.5);   // Forward, up
rightLowerArm.rotation.set(0, -1.8, 0);        // Elbow bent
rightHand.rotation.set(-1.9, waveAngle, 0);    // Palm oriented + wave
```

---

## ⚠️ Notes Importantes

1. **Le signe compte !** Inverser le signe = direction opposée
2. **Le modèle est tourné** : Notre personnage fait face à la caméra (-Z), donc certains axes sont "inversés" par rapport aux docs VRM standard
3. **Tester par petits incréments** : Changer de 0.1 à 0.3 d'abord pour voir l'effet
4. **Les expressions** : Utilisez `vrm.expressionManager.setValue('happy', 0.8)` pour les émotions
