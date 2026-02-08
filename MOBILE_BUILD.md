# Build APK pour tester Odicam sur mobile

L’app utilise **Capacitor 7** avec la plateforme Android. Voici comment générer un APK pour tester sur un appareil ou un émulateur.

---

## Prérequis

- **Node.js** et **npm** (déjà utilisés pour le projet)
- **Java 17** (ou 21) : le projet est configuré pour compiler avec Java 17 (JDK 17 suffit). Vérifier avec `java -version`.
- **Android SDK** : le plus simple est d’installer [Android Studio](https://developer.android.com/studio) ; il installe le SDK (souvent `~/Android/Sdk` sous Linux, `~/Library/Android/sdk` sous macOS).

**Configurer le SDK pour la ligne de commande :**

- Soit définir la variable d’environnement **`ANDROID_HOME`** (ou `ANDROID_SDK_ROOT`) vers le dossier du SDK.
- Soit créer le fichier **`app/android/local.properties`** avec une seule ligne (adapter le chemin) :
  ```properties
  sdk.dir=/chemin/vers/Android/Sdk
  ```
  Un exemple est fourni : `app/android/local.properties.example`.

**Installation automatique (Debian/Ubuntu) :** un script installe Java 21 et le SDK Android (outils en ligne de commande + plateforme 35, build-tools). Le projet a été patché pour accepter **Java 17** : si vous n’avez que le JDK 17, le build fonctionne aussi.

```bash
sudo ./scripts/install-android-build-deps.sh
```

Puis charger l’environnement dans le shell : `source /etc/profile.d/odicam-android-build.sh`, ou ouvrir un nouveau terminal. Ensuite `cd app && npm run build:apk`.

---

## 1. Build web + sync Android

Depuis la racine du repo :

```bash
cd app
npm run build:android
```

Cela exécute `npm run build` puis `npx cap sync android` : le contenu de `dist/` est copié dans le projet Android.

**Si après `cap sync` le build échoue avec « invalid source release: 21 » :** le fichier `app/android/app/capacitor.build.gradle` est régénéré avec Java 21. Remplacez `VERSION_21` par `VERSION_17` dans ce fichier (deux occurrences dans `compileOptions`), puis relancez `./gradlew assembleDebug`.

---

## 2. Générer l’APK

Deux options.

### A. En ligne de commande (si Android SDK est dans le PATH)

```bash
cd app
npm run build:apk
```

Cela fait un build web, un sync Android, puis `npx cap build android` (build natif). Si tout est configuré, l’APK de debug se trouve dans :

`app/android/app/build/outputs/apk/debug/app-debug.apk`

Vous pouvez aussi :

```bash
cd app/android
./gradlew assembleDebug
```

L’APK debug est au même endroit.

### B. Avec Android Studio (le plus simple si pas de SDK en CLI)

1. Ouvrir Android Studio.
2. **File → Open** et sélectionner le dossier **`app/android`** (pas `app`).
3. Attendre la fin de l’indexation / sync Gradle.
4. **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
5. Une fois le build terminé, cliquer sur **Locate** dans la notification pour ouvrir le dossier contenant l’APK (souvent `app/build/outputs/apk/debug/`).

Pour un **APK de release** (signé) : **Build → Generate Signed Bundle / APK** et suivre l’assistant (keystore, mot de passe, etc.).

---

## 3. Installer sur un appareil

- **Émulateur** : dans Android Studio, **Run → Run 'app'** (ou le bouton Play) après avoir créé un AVD.
- **Appareil physique** : activer le **mode développeur** et le **débogage USB**, brancher le téléphone, puis copier l’APK dessus et l’installer (ou utiliser **Run** avec l’appareil sélectionné).

---

## Scripts npm (dans `app/`)

| Script | Description |
|--------|-------------|
| `npm run sync:android` | Sync uniquement : copie `dist/` vers le projet Android (après un `npm run build`). |
| `npm run build:android` | Build web + sync Android. |
| `npm run build:apk` | Build web + sync + build natif Android (nécessite le SDK). |

---

## En résumé

1. Définir les variables d’environnement comme pour le déploiement web (`VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_ANON_KEY`) avant de lancer `npm run build` ou `build:android`.
2. `npm run build:android` depuis `app/`.
3. Générer l’APK avec **Android Studio** (ouvrir `app/android`) ou `npm run build:apk` si le SDK est configuré.
4. Installer l’APK sur l’émulateur ou le téléphone pour tester.

Pour plus de détails sur le workflow Capacitor : [capacitorjs.com/docs/basics/workflow](https://capacitorjs.com/docs/basics/workflow).
