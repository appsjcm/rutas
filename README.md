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

Compartir ruta genera un enlace que lleva la ronda entera dentro: las coordenadas van codificadas y comprimidas en la parte del enlace que nunca viaja al servidor, asi que no se sube nada a ningun sitio. La ronda de ejemplo con la que se prueba, 26 km y 4933 puntos, cabe en unos 9 KB de enlace. Quien lo abre ve la ronda cargada y guardada en su dispositivo. El codigo QR tiene mucha menos capacidad: si la ronda no cabe se ofrece una version aligerada, diciendo cuantos puntos conserva y con cuanta desviacion, y el enlace sigue llevando la version completa. El codificador redondea a cinco decimales, unos 30 cm, asi que la distancia total puede variar medio punto porcentual.

Publicación mediante GitHub Pages desde main.

## Sin conexión

Un service worker guarda la aplicación entera -código, estilos, Leaflet y los iconos- la primera vez que se abre, así que arranca sin cobertura. Las teselas del mapa se guardan solo cuando el mapa las ha pedido de verdad, mientras exploras la ruta o conduces, con un tope de 1500: no hay descarga por lotes, que es lo que desaconseja la política de uso de OpenStreetMap. Preparar la ronda en el depósito, con datos, deja esas calles disponibles después. Una zona que no se haya visto nunca aparecerá vacía, y un aviso en pantalla lo indica mientras no haya conexión. Las consultas a Overpass nunca pasan por ese almacén: tienen su propia caducidad de 24 horas.

En pantallas de telefono la cabecera se reduce y la explicacion de portada se oculta -sigue entera en la pestana Guia-, las pestanas se acortan y quedan fijas arriba, y todo lo que se toca mide al menos 44 px. Los campos usan 16 px para que iOS no haga zoom al enfocarlos. Con eso la primera pestana aparece a 61 px del borde en vez de a 178, y el mapa entra en pantalla sin desplazarse.

La aplicación se puede instalar en la pantalla de inicio con su manifiesto e iconos. Una versión nueva se descarga en segundo plano y entra al cerrar y volver a abrir, para no cambiar el código a mitad de una ronda.

## Comprobación de sentidos

En Navegar, Comprobar mi recorrido compara muestras de la traza con vías de OpenStreetMap, incluyendo oneway=yes, oneway=-1, rotondas y excepciones para vehículos a motor. Las restricciones variables y las vías cercanas ambiguas se señalan aparte. No es una validación legal ni sustituye la señalización. No revisa obras ni prohibiciones de giro. Si rellenas las medidas de tu vehículo -altura, peso y anchura, opcionales y guardadas en el dispositivo- se comprueban además maxheight, maxweight y maxwidth, con la variante :hgv por delante de la general, y las vías cerradas por hgv, access o motor_vehicle. Un límite solo salta cuando tu vehículo no cabe, y el aviso dice la medida de la vía y la tuya. Sin medidas, esa parte no se comprueba y no aparece ningún aviso dimensional. access=destination no se señala: una ronda de recogida entra legítimamente en esas calles.

Se muestra la fecha de los datos, cobertura de coincidencia, señales sobre el mapa, enlaces a las fuentes y un informe CSV descargable. Cada aviso puede marcarse como revisado: ese tramo queda silenciado en el mapa, en el panel, en el banner y en la voz, y el informe CSV recoge su estado. Cuando la ronda repite una calle, un segundo botón silencia de una vez todos sus tramos, sin extender el silencio a un conflicto nuevo que aparezca más adelante en esa misma vía. Así solo hablan los avisos que aún no ha mirado nadie. La marca se guarda en el dispositivo junto a la huella de la ruta, sobrevive a nuevas consultas y se revierte desde el mismo botón. Un posible conflicto tiene prioridad sobre el aviso de giro. La consulta envía a Overpass solamente el rectángulo de la zona, sin puntos ni tiempos del GPX. Los datos se guardan durante 24 horas en el navegador para evitar consultas repetidas. Al guardar una consulta nueva se borran las caducadas y solo se conservan las dos ultimas, porque cada una pesa mas de un megabyte y en iPhone el almacen ronda los cinco. Servidores: overpass-api.de y, si no responde, overpass.kumi.systems de Private.coffee, probados en ese orden con 25 segundos cada uno. Una respuesta vacía se trata como fallo y pasa al siguiente: un servidor que solo sirve otra región contestaría sin calles, y eso diría «no hay conflictos» sin haber comprobado nada. Datos © OpenStreetMap contributors, ODbL. Las rutas personales y sus informes no están incluidos en el repositorio.

Si el servidor público falla, Cargar datos de calles permite importar un JSON de Overpass (out tags geom) y realizar la misma comprobación local, mostrando siempre la fecha de sus datos. El JSON también permanece en el dispositivo.

## Vista de conducción

Iniciar navegación abre el mapa a pantalla completa con una franja superior negra: flecha del giro, distancia en grande y nombre de la calle de destino cuando OpenStreetMap lo ha podido identificar. Abajo, una hoja con el tiempo que queda, la hora de llegada y la distancia, la barra de avance y la siguiente parada de la ronda. El velocímetro es el círculo de la esquina inferior izquierda.

El tiempo restante no se estima por velocidad sino con las horas del propio GPX: el recorrido grabado ya sabe cuánto se tarda desde cada punto hasta el final, incluidas las paradas. Si el GPX no trae horas se recurre a la velocidad del GPS.

El botón N orienta el mapa a la marcha en vez de al norte. Al girar teselas de imagen giran también sus rótulos, así que los nombres de calle salen inclinados: por eso es un interruptor y no el comportamiento fijo. La cámara sigue el GPS y ajusta el zoom según la velocidad. Arrastrar el mapa suspende el centrado hasta pulsar Volver a seguir. La vista incluye controles de voz, repetir indicación y Finalizar. Los avisos de sentido contrario permanecen visibles y se apoderan de la franja superior. Al detenerse, llegar al final o denegarse el GPS, se vuelve a la vista normal.

## Continuidad del recorrido

El seguimiento tiene en cuenta el rumbo cuando es fiable para distinguir ida y vuelta. El avance se guarda localmente con una huella de las coordenadas y su orden: una ruta invertida no recupera el avance de la original. Continuar desde… selecciona el punto guardado; no inicia el GPS sin pulsar Iniciar navegación. Buscar mi pasada ofrece hasta cinco posiciones cercanas dentro del recorrido para elegir explícitamente cuando se repiten calles.

Ambas comprobaciones -sentidos y nombres de calle- comparten una misma rejilla espacial de las vias descargadas, de modo que cada muestra solo examina las vias de su celda en vez de todas. Al comprobar los datos de calles o importar el JSON de calles, las indicaciones incorporan nombres de vías si hay una coincidencia geométrica suficientemente clara antes y después de la maniobra. Las curvas dentro de la misma calle se distinguen de los giros; las indicaciones sin una correspondencia clara siguen marcadas como estimadas del GPX. No es un motor de rutas sobre la red viaria. Los puntos originales, sus pasadas y los avisos de sentido contrario se conservan: no se recalcula ni se desvía la ruta.

## Revisión de navegación

La cabecera pausa las indicaciones cuando el GPS no es fiable y muestra el tipo concreto de restricción que se aproxima. Al salir de la conducción, el mapa recupera el norte. Invertir una ruta conserva sus paradas y permite estimar la duración a partir del registro original.

Los avisos revisados se guardan por tramo y tipo: silenciar un aviso de sentido no silencia uno de peso en la misma calle. Las marcas antiguas sin tipo deben revisarse de nuevo. Cambiar de ruta descarta los datos de calles asociados a la anterior. Las excepciones de acceso más específicas prevalecen sobre las generales.

Cuando hay una versión preparada aparece «Nueva versión · actualizar». Solo se aplica al pulsar el botón con la navegación detenida. La limpieza de versiones anteriores conserva las cachés de otras aplicaciones del mismo dominio.

## Mapa 3D de calles

El selector 2D / 3D activa un segundo renderizador con MapLibre GL JS 4.7.1 (licencia BSD incluida) y el estilo Liberty de OpenFreeMap. Ofrece calles rotuladas, edificios con volumen donde existen datos y una cámara a 55 grados. La primera activación carga el motor; los datos de OpenFreeMap se solicitan únicamente al activar esta vista y requieren conexión. No se guarda el mapa vectorial para uso sin conexión ni se envía la traza GPX al proveedor: se piden las teselas del área visible.

El seguimiento, los giros y las restricciones siguen dependiendo del mismo GPX y del mismo motor de navegación. Ambas vistas comparten posición, avance y avisos revisados; cambiar de vista no recalcula la ruta. Al iniciar navegación desde 3D se activa la orientación a la marcha; el botón de orientación permite volver al norte. Arrastrar suspende el seguimiento y Centrar GPS lo recupera. Una falta de soporte gráfico, pérdida del contexto WebGL o carga inicial agotada devuelve al mapa 2D.

Fuentes de integración: https://openfreemap.org/quick_start/ y https://maplibre.org/maplibre-gl-js/docs/examples/display-buildings-in-3d/ . El volumen de los edificios es cartográfico, no fotografía ni Street View.

Validación: carga real de calles y edificios, GPS simulado con rumbo, pausa y recuperación de cámara, cambio 2D/3D durante navegación, avisos sobre el mapa y limpieza al cambiar de ruta. Verificado también el retorno a 2D sin WebGL y las 39 pruebas del motor existente. Pendiente la comprobación de rendimiento con GPS real en el teléfono.

## Llegar al comienzo

Al iniciar, la primera posición GPS reciente con precisión de 60 metros o mejor se compara con el punto seleccionado del GPX. Si queda a más de 100 metros en línea recta, se detiene el seguimiento sin avanzar por la traza y se ofrece llegar con Google Maps. El botón Llegar al inicio permite abrir este acceso antes de activar el GPS. Si se ha elegido una pasada posterior, ese punto es el destino.

El enlace usa Maps URLs (https://developers.google.com/maps/architecture/maps-url), modo driving y dir_action=navigate; omite el origen para que Google Maps utilice la ubicación del dispositivo. Solo incluye el destino, nunca el GPX completo. Dependiendo del dispositivo y de la ubicación disponible, Google Maps abre navegación o vista previa. No es un itinerario adaptado a las dimensiones del camión. Al regresar a Rutas hay que pulsar Iniciar navegación; no se inicia automáticamente ni se altera el recorrido.

Comprobado en navegador con GPS simulado: lejos no avanza el GPX, cerca comienza el seguimiento, baja precisión mantiene la espera, cambiar la pasada actualiza el destino y Escape cierra el diálogo. Las 39 pruebas existentes siguen pasando.

### Volver del acceso

Al abrir Google Maps se guarda localmente la huella de la ruta y el punto seleccionado, durante un máximo de 24 horas. La tarjeta «Tu ruta te espera» sobrevive a una recarga. «Ya he llegado · comprobar GPS» recupera ese punto y solicita una posición fiable antes de comenzar; no inicia nada automáticamente al volver a la app. El recordatorio se borra al comenzar cerca del destino, al descartarlo, al cambiar a otra ruta o al caducar.

La carga inicial del mapa 3D mantiene visible el mapa 2D, señala que está cargando y permite cancelar y reintentar. Validado en navegador con respuesta de cartografía retrasada y con GPS simulado para regreso cercano y lejano después de recargar la página.

### Indicaciones y cartografía más legibles

La cabecera de conducción distingue preparación, cercanía y maniobra inmediata; «Ahora» aparece cuando se alcanza el umbral de la indicación. Se separan la calle y la acción y se muestra el giro siguiente. La voz utiliza acciones directas y, cuando hay otro giro a 100 metros o menos del actual, lo anticipa al anunciar la maniobra inmediata. Estas indicaciones siguen siendo estimaciones de la geometría del GPX. Los avisos de restricciones tienen prioridad, y una pérdida de precisión GPS limpia las instrucciones secundarias.

El mapa 3D oculta inicialmente las capas de lugares y comercios; el botón Lugares permite recuperarlas y conserva la elección en el dispositivo. Los nombres de calles y las flechas de sentido siguen presentes. El recorrido lleva un contorno blanco y los edificios son más suaves. La posición de los controles se adapta a la altura real de la cabecera.

Verificado con las 39 pruebas del motor, GPS simulado, dos giros próximos, voz, GPS impreciso, visibilidad de etiquetas, seguimiento 3D, restricciones y cambio de ruta.
