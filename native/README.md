# MultiTV nativa (iOS y Android)

App independiente hecha con **Expo / React Native**. No necesita el servidor de la versión web: resuelve las señales y reproduce el HLS directamente en el dispositivo.

## Requisitos

- Node.js 22 o superior.
- Un móvil con **Expo Go** (SDK 58), o un *development build*.
- Para publicar: cuenta de Expo (EAS) y, en iOS, cuenta de Apple Developer.

## Probar en el móvil

Desde la raíz del repositorio:

```bash
npm run native:sync
cd native
npm install
npx expo start
```

Escanea el QR con Expo Go (Android) o con la cámara (iPhone/iPad). El móvil y el ordenador deben estar en la misma red; si no, usa:

```bash
npx expo start --tunnel
```

La primera vez carga la parrilla por defecto (La 1, La 2, Antena 3, laSexta, 24h y Teledeporte). El botón de la lupa abre el catálogo completo (más de 180 canales), agrupado por comunidad.

## Compilar una app instalable

La compilación nativa se hace en la nube con EAS. No hace falta Android Studio ni un Mac:

```bash
npm install -g eas-cli
eas login
eas init
eas build --platform android --profile preview   # APK para probar
eas build --platform ios --profile preview       # requiere cuenta Apple
```

Para publicar en las tiendas:

```bash
eas build --platform all --profile production
eas submit --platform android
eas submit --platform ios
```

Los identificadores están en [`app.json`](app.json): `com.multitv.app`. Cámbialos si publicas con otra cuenta.

## Qué incluye

- Mosaico de hasta **6 canales** simultáneos, con 1–3 columnas.
- **Audio exclusivo**: tocar una TV silencia las demás; volver a tocarla la silencia.
- Pausa/reanudación por canal y global, volumen, modo solo y pantalla completa.
- Buscador de canales por grupos, canales propios por URL HLS e importación de listas M3U.
- Resolución dinámica de Atresplayer y Brightcove dentro de la app.
- Persistencia de parrilla, columnas, volumen y canales propios con AsyncStorage.
- Mantiene la pantalla encendida mientras la app está en primer plano.

En iPhone/iPad, iOS limita la decodificación simultánea: si ves cortes, baja a 2–4 canales. En Android, la decodificación depende del chip; 6 suele funcionar en gamas media/alta.

## Actualizar el catálogo

Cuando cambien las señales, desde la raíz:

```bash
npm run catalog
npm run native:sync
```

`native:sync` copia `data/channels.json`, convierte los logos a PNG y regenera `src/logoMap.ts`. Después reinicia Metro con caché limpia:

```bash
npx expo start -c
```

## Comprobaciones

```bash
npm run typecheck
npm run export:android
npm run export:ios
```

## Límites conocidos

- Las cadenas geobloqueadas solo se ven desde España.
- Mediaset (Telecinco, Cuatro…) usa DRM y no está incluida; tampoco se intenta saltar.
- Algunas URLs son HTTP: el binario permite tráfico en claro (`usesCleartextTraffic` en Android y ATS en iOS) porque las cadenas públicas no siempre sirven HTTPS.
- Los tokens de Atresplayer/Brightcove caducan; la app los renueva al reintentar.
