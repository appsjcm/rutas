# Rutas

Navegador web para seguir recorridos GPX sobre un mapa de calles.

Web: https://appsjcm.github.io/rutas/

## Uso

1. Abre Navegar y carga un GPX desde tu dispositivo.
2. Si contiene varias trazas o segmentos, elige uno.
3. Explora la ruta con el control de distancia o Reproducir. Street View abre las panorámicas disponibles del punto seleccionado en Google.
4. Sitúa el control en tu punto de inicio y pulsa Iniciar GPS. Permite la ubicación y mantén la página visible.

La línea gris muestra todo el recorrido, la verde lo completado y la azul los próximos 200 metros. Las flechas indican el sentido. El mapa puede ampliarse a pantalla completa. La posición real aparece con un círculo de precisión. Se muestran distancia restante y velocidad, con avisos opcionales de desvío y de giro por voz. Los giros se estiman por la geometría del GPX y se pueden consultar para todo el recorrido. La navegación en directo ofrece avisos de preparación, proximidad y «Ahora», ajustados a la velocidad; muestra el siguiente giro y las indicaciones completadas. La voz está activada inicialmente y se puede desactivar o repetir. Ante una posición imprecisa, antigua o ausente durante 20 segundos, las indicaciones se pausan hasta recuperar una posición válida. La reproducción admite velocidades 1×, 5× y 25×.

El seguimiento conserva el orden del GPX, también cuando se repiten calles. No calcula rutas alternativas ni ofrece instrucciones de giro basadas en señalización o restricciones de circulación. Si cambias de pasada, detén el GPS y selecciona el punto correcto. Los mapas necesitan conexión; el navegador puede suspender la ubicación en segundo plano.

## Datos y servicios

Los GPX se procesan en el dispositivo y no se suben al repositorio. La ruta cargada, la grabación y los puntos manuales usan almacenamiento local del navegador. La ruta se recupera al volver y puede eliminarse con Olvidar ruta guardada. El mapa solicita únicamente las teselas visibles a OpenStreetMap. Al abrir Street View se envían a Google las coordenadas del punto elegido. Las fuentes y el generador de QR usan servicios externos.

Leaflet 1.9.4 se distribuye en vendor con su licencia. Mapas: © OpenStreetMap contributors. Street View utiliza las URLs oficiales de Google Maps sin clave. Integrar panorámicas dentro de la página requeriría configurar la API de Google Maps por separado.

## Comprobaciones

`node --test tests/navigation.test.cjs`

Publicación mediante GitHub Pages desde main.
