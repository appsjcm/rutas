# Rutas

Navegador web para seguir recorridos GPX sobre un mapa de calles.

Web: https://appsjcm.github.io/rutas/

## Uso

1. Abre Navegar y carga un GPX desde tu dispositivo.
2. Si contiene varias trazas o segmentos, elige uno.
3. Explora la ruta con el control de distancia o Reproducir. Street View abre las panorámicas disponibles del punto seleccionado en Google.
4. Sitúa el control en tu punto de inicio y pulsa Iniciar GPS. Permite la ubicación y mantén la página visible.

La línea naranja es el recorrido; el tramo azul muestra los próximos 160 metros. La posición real aparece con un círculo de precisión. Se muestran distancia restante y velocidad, con avisos opcionales de desvío por voz.

El seguimiento conserva el orden del GPX, también cuando se repiten calles. No calcula rutas alternativas ni ofrece instrucciones de giro basadas en señalización o restricciones de circulación. Si cambias de pasada, detén el GPS y selecciona el punto correcto. Los mapas necesitan conexión; el navegador puede suspender la ubicación en segundo plano.

## Datos y servicios

Los GPX se procesan en el dispositivo y no se suben al repositorio. La grabación y los puntos manuales usan almacenamiento local. El mapa solicita únicamente las teselas visibles a OpenStreetMap. Al abrir Street View se envían a Google las coordenadas del punto elegido. Las fuentes y el generador de QR usan servicios externos.

Leaflet 1.9.4 se distribuye en vendor con su licencia. Mapas: © OpenStreetMap contributors. Street View utiliza las URLs oficiales de Google Maps sin clave. Integrar panorámicas dentro de la página requeriría configurar la API de Google Maps por separado.

## Comprobaciones

`node --test tests/navigation.test.cjs`

Publicación mediante GitHub Pages desde main.
