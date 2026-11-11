# Contribuir a MultiTV

Gracias por querer mejorar el proyecto. Estas son las reglas básicas.

## Antes de abrir un issue

- Comprueba que el canal falla también en su web oficial: muchas emisiones cambian de URL o se geobloquean fuera de España.
- Si el problema es una señal caída, indica el canal, la hora y el país desde el que pruebas.
- Para canales nuevos, enlaza la fuente pública y legal de la emisión (por ejemplo, la página de TDTChannels o el reproductor oficial).

## Qué se acepta

- Señales públicas, en abierto y sin DRM.
- Cadenas que publican HLS accesible desde su propio reproductor.
- Correcciones de nombres, grupos, logos y metadatos.
- Mejoras de interfaz, accesibilidad, rendimiento y documentación.

## Qué no se acepta

- Restreams de señales de terceros, listas de pago o enlaces de proveedores IPTV.
- Cualquier cambio que rompa protecciones (DRM, tokens privados, autenticación).
- Canales que solo funcionan con credenciales de otra persona.

## Flujo de trabajo

1. Haz un fork y crea una rama: `feat/mi-cambio` o `fix/mi-arreglo`.
2. Instala las dependencias con `npm install`.
3. Si tocas canales, ejecuta `npm run catalog` para regenerar `data/channels.json` y `public/logos/`.
4. Si tocas la app nativa, ejecuta `npm run native:sync` y `cd native && npm run typecheck`.
5. Antes de subir: `npm run check`.
6. Abre una pull request explicando qué cambia y cómo lo has probado.

## Estilo

- JavaScript y TypeScript sin punto y coma final, comillas simples y 2 espacios de indentación.
- Comenta solo lo que no sea evidente.
- Mantén los textos de interfaz en español.
- No añadas dependencias si se puede resolver con la biblioteca estándar de Node.

## Licencia

Al enviar una contribución aceptas que se publique bajo la licencia MIT del proyecto.
