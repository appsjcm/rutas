# Rutas

Navegador web para seguir recorridos GPX sobre un mapa de calles.

Web: https://appsjcm.github.io/rutas/

## Uso

1. Abre Navegar y carga un GPX desde tu dispositivo.
2. Si contiene varias trazas o segmentos, elige uno.
3. Explora la ruta con el control de distancia o Reproducir. Street View abre las panorámicas disponibles del punto seleccionado en Google.
4. Sitúa el control en tu punto de inicio y pulsa Iniciar GPS. Permite la ubicación y mantén la página visible.

La línea gris muestra todo el recorrido, la verde lo completado y la azul los próximos 200 metros. Las flechas indican el sentido. El mapa puede ampliarse a pantalla completa. La posición real aparece con un círculo de precisión. Se muestran distancia restante y velocidad, con avisos opcionales de desvío y de giro por voz. Los giros se estiman por la geometría del GPX y se pueden consultar para todo el recorrido. Si el GPX trae horas, se detectan además las paradas de 3 minutos o más dentro de un radio de 40 metros y se muestra cuántas llevas hechas de la ronda. Solo se anuncian los tomados a 5 km/h o más, medidos con las marcas de tiempo del propio GPX, y con 60 metros mínimos entre indicaciones: así la deriva del GPS durante una parada no genera giros inexistentes ni se encadenan dos avisos imposibles de seguir. Cuando el GPX no trae horas, solo se aplica la separación mínima. La navegación en directo ofrece avisos de preparación, proximidad y «Ahora», ajustados a la velocidad; muestra el siguiente giro y las indicaciones completadas. La voz está activada inicialmente y se puede desactivar o repetir. Ante una posición imprecisa, antigua o ausente durante 20 segundos, las indicaciones se pausan hasta recuperar una posición válida. La reproducción admite velocidades 1×, 5× y 25×.

El seguimiento conserva el orden del GPX, también cuando se repiten calles. No calcula rutas alternativas ni ofrece instrucciones de giro basadas en señalización o restricciones de circulación. Si cambias de pasada, detén el GPS y selecciona el punto correcto. Los mapas necesitan conexión; el navegador puede suspender la ubicación en segundo plano.

## Datos y servicios

Los GPX se procesan en el dispositivo y no se suben al repositorio. La ruta cargada, la grabación y los puntos manuales usan almacenamiento local del navegador. La ruta se recupera al volver y puede eliminarse con Olvidar ruta guardada. El mapa solicita únicamente las teselas visibles a OpenStreetMap. Al abrir Street View se envían a Google las coordenadas del punto elegido. Las fuentes y el generador de QR usan servicios externos.

Leaflet 1.9.4 se distribuye en vendor con su licencia. Mapas: © OpenStreetMap contributors. Street View utiliza las URLs oficiales de Google Maps sin clave. Integrar panorámicas dentro de la página requeriría configurar la API de Google Maps por separado.

## Comprobaciones

`node --test tests/navigation.test.cjs tests/restrictions.test.cjs`

Publicación mediante GitHub Pages desde main.

## Sin conexión

Un service worker guarda la aplicación entera -código, estilos, Leaflet y los iconos- la primera vez que se abre, así que arranca sin cobertura. Las teselas del mapa se guardan solo cuando el mapa las ha pedido de verdad, mientras exploras la ruta o conduces, con un tope de 1500: no hay descarga por lotes, que es lo que desaconseja la política de uso de OpenStreetMap. Preparar la ronda en el depósito, con datos, deja esas calles disponibles después. Una zona que no se haya visto nunca aparecerá vacía, y un aviso en pantalla lo indica mientras no haya conexión. Las consultas a Overpass nunca pasan por ese almacén: tienen su propia caducidad de 24 horas.

La aplicación se puede instalar en la pantalla de inicio con su manifiesto e iconos. Una versión nueva se descarga en segundo plano y entra al cerrar y volver a abrir, para no cambiar el código a mitad de una ronda.

## Comprobación de sentidos

En Navegar, Comprobar mi recorrido compara muestras de la traza con vías de OpenStreetMap, incluyendo oneway=yes, oneway=-1, rotondas y excepciones para vehículos a motor. Las restricciones variables y las vías cercanas ambiguas se señalan aparte. No es una validación legal ni sustituye la señalización. No revisa obras ni prohibiciones de giro. Si rellenas las medidas de tu vehículo -altura, peso y anchura, opcionales y guardadas en el dispositivo- se comprueban además maxheight, maxweight y maxwidth, con la variante :hgv por delante de la general, y las vías cerradas por hgv, access o motor_vehicle. Un límite solo salta cuando tu vehículo no cabe, y el aviso dice la medida de la vía y la tuya. Sin medidas, esa parte no se comprueba y no aparece ningún aviso dimensional. access=destination no se señala: una ronda de recogida entra legítimamente en esas calles.

Se muestra la fecha de los datos, cobertura de coincidencia, señales sobre el mapa, enlaces a las fuentes y un informe CSV descargable. Cada aviso puede marcarse como revisado: ese tramo queda silenciado en el mapa, en el panel, en el banner y en la voz, y el informe CSV recoge su estado. Cuando la ronda repite una calle, un segundo botón silencia de una vez todos sus tramos, sin extender el silencio a un conflicto nuevo que aparezca más adelante en esa misma vía. Así solo hablan los avisos que aún no ha mirado nadie. La marca se guarda en el dispositivo junto a la huella de la ruta, sobrevive a nuevas consultas y se revierte desde el mismo botón. Un posible conflicto tiene prioridad sobre el aviso de giro. La consulta envía a Overpass solamente el rectángulo de la zona, sin puntos ni tiempos del GPX. Los datos se guardan durante 24 horas en el navegador para evitar consultas repetidas. Servidores: overpass-api.de y, si no responde, overpass.kumi.systems de Private.coffee, probados en ese orden con 25 segundos cada uno. Una respuesta vacía se trata como fallo y pasa al siguiente: un servidor que solo sirve otra región contestaría sin calles, y eso diría «no hay conflictos» sin haber comprobado nada. Datos © OpenStreetMap contributors, ODbL. Las rutas personales y sus informes no están incluidos en el repositorio.

Si el servidor público falla, Cargar datos de calles permite importar un JSON de Overpass (out tags geom) y realizar la misma comprobación local, mostrando siempre la fecha de sus datos. El JSON también permanece en el dispositivo.

## Vista de conducción

Iniciar navegación abre automáticamente el mapa a pantalla completa, con el próximo giro, posición orientada por el GPS, velocidad, distancia restante y progreso. La cámara sigue el GPS y ajusta el zoom según la velocidad; el mapa permanece orientado al norte. Arrastrar el mapa suspende el centrado hasta pulsar Volver a seguir. La vista incluye controles de voz, repetir indicación y Finalizar. Los avisos de sentido contrario permanecen visibles. Al detenerse, llegar al final o denegarse el GPS, se vuelve a la vista normal.

## Continuidad del recorrido

El seguimiento tiene en cuenta el rumbo cuando es fiable para distinguir ida y vuelta. El avance se guarda localmente con una huella de las coordenadas y su orden: una ruta invertida no recupera el avance de la original. Continuar desde… selecciona el punto guardado; no inicia el GPS sin pulsar Iniciar navegación. Buscar mi pasada ofrece hasta cinco posiciones cercanas dentro del recorrido para elegir explícitamente cuando se repiten calles.

Al comprobar los datos de calles o importar el JSON de calles, las indicaciones incorporan nombres de vías si hay una coincidencia geométrica suficientemente clara antes y después de la maniobra. Las curvas dentro de la misma calle se distinguen de los giros; las indicaciones sin una correspondencia clara siguen marcadas como estimadas del GPX. No es un motor de rutas sobre la red viaria. Los puntos originales, sus pasadas y los avisos de sentido contrario se conservan: no se recalcula ni se desvía la ruta.
