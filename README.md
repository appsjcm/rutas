# Rutas

Navegador web para seguir recorridos GPX sobre un mapa de calles.

Web: https://appsjcm.github.io/rutas/

## Uso

1. Abre Navegar y carga un GPX desde tu dispositivo.
2. Si contiene varias trazas o segmentos, elige uno.
3. Explora la ruta con el control de distancia o Reproducir y cambia entre mapa 2D, satélite híbrido y calles 3D.
4. Sitúa el control en tu punto de inicio y pulsa Iniciar GPS. Permite la ubicación y mantén la página visible.

La línea gris muestra todo el recorrido, la verde lo completado y la azul los próximos 200 metros. Las flechas indican el sentido. El mapa puede ampliarse a pantalla completa. La posición real aparece con un círculo de precisión. Se muestran distancia restante y velocidad, con avisos opcionales de desvío y de giro por voz. Los giros se estiman por la geometría del GPX y se pueden consultar para todo el recorrido. Si el GPX trae horas, se detectan además las paradas de 3 minutos o más dentro de un radio de 40 metros y se muestra cuántas llevas hechas de la ronda. Solo se anuncian los tomados a 5 km/h o más, medidos con las marcas de tiempo del propio GPX, y con 60 metros mínimos entre indicaciones: así la deriva del GPS durante una parada no genera giros inexistentes ni se encadenan dos avisos imposibles de seguir. Cuando el GPX no trae horas, solo se aplica la separación mínima. La navegación en directo ofrece avisos de preparación, proximidad y «Ahora», ajustados a la velocidad; muestra el siguiente giro y las indicaciones completadas. Si dos posiciones fiables confirman que el vehículo se ha desviado, propone un punto futuro lógico y puede calcular un regreso temporal por calles sin adelantar ni sustituir el GPX. La voz está activada inicialmente y se puede desactivar o repetir. Ante una posición imprecisa, antigua o ausente durante 20 segundos, las indicaciones se pausan hasta recuperar una posición válida. La reproducción admite velocidades 1×, 5× y 25×.

El seguimiento conserva el orden del GPX, también cuando se repiten calles. El regreso tras un desvío solo lleva a un punto posterior cercano; no recalcula ni reemplaza la ronda completa. Las instrucciones del GPX no garantizan la legalidad del paso. Si cambias de pasada, detén el GPS y selecciona el punto correcto. Los mapas necesitan conexión; el navegador puede suspender la ubicación en segundo plano.

Al cargar un GPX aparece una revisión automática compacta con continuidad y segmentos, coincidencia con calles, sentidos y restricciones conocidas. Termina como Preparada o Revisar y abre los avisos cuando encuentra incidencias. Los recorridos recuperados del dispositivo reutilizan sus datos guardados para no repetir consultas.

## Datos y servicios

Los GPX se procesan en el dispositivo y no se suben al repositorio. La ruta cargada, la grabación y los puntos manuales usan almacenamiento local del navegador. La ruta se recupera al volver y puede eliminarse con Olvidar ruta guardada. El mapa solicita únicamente las teselas visibles a OpenStreetMap o Esri. Las fuentes y el generador de QR usan servicios externos.

Leaflet 1.9.4 se distribuye en vendor con su licencia. Mapas: © OpenStreetMap contributors. Satélite: Esri, Maxar, Earthstar Geographics y GIS User Community.

## Simulador de conducción

Abrir la aplicación con `?sim=1` añade un simulador que sustituye el GPS por una posición generada sobre el recorrido cargado. Solo aparece con ese parámetro y nunca sobrevive a una recarga: una posición falsa activada por descuido dentro de un vehículo sería peligrosa. Mientras corre, una franja roja avisa de que la posición no es real.

Simular arranca también la navegación y abre el mapa a pantalla completa: la simulación sirve para ver la ruta en marcha, y tener que pulsar después «Iniciar navegación» y «Ampliar mapa» sobraba.

Permite elegir velocidad -30, 50 u 80 km/h-, calidad de señal, desvío lateral de 50 o 100 metros y simular la falta de Internet. La señal irregular introduce ruido y pierde una posición de cada ocho; la mala llega a 65 metros de imprecisión, por encima del umbral con el que la navegación deja de fiarse, y pierde una de cada tres. El desvío aparta la posición en perpendicular a la marcha, sin inventar calles.

Como no toca la navegación sino la fuente de posiciones, lo que se prueba es exactamente el mismo código que corre en la carretera: emparejado, giros, voz, paradas, avisos de desvío y comportamiento sin cobertura.

## Comprobaciones

`node --test tests/*.cjs`

Compartir ruta genera un enlace que lleva la ronda entera dentro: las coordenadas van codificadas y comprimidas en la parte del enlace que nunca viaja al servidor, asi que no se sube nada a ningun sitio. La ronda de ejemplo con la que se prueba, 26 km y 4933 puntos, cabe en unos 9 KB de enlace. Quien lo abre ve la ronda cargada y guardada en su dispositivo. El codigo QR tiene mucha menos capacidad: si la ronda no cabe se ofrece una version aligerada, diciendo cuantos puntos conserva y con cuanta desviacion, y el enlace sigue llevando la version completa. El codificador redondea a cinco decimales, unos 30 cm, asi que la distancia total puede variar medio punto porcentual.

Publicación mediante GitHub Pages desde main.

## Servicios de calles

Reconocer las calles del GPX lo hace Valhalla de FOSSGIS. No tiene reserva para esa tarea: el OSRM publico limita el emparejado a diez coordenadas por peticion, asi que cubrir una ronda costaria unas doscientas peticiones. Si Valhalla no responde no hay trazado vial y la navegacion se queda con el GPX original, que es el comportamiento seguro.

Enlazar los cortes si tiene reserva, porque ahi basta con dos puntos por peticion: primero Valhalla en lotes de cinco cortes -admite diez localizaciones y cada corte gasta dos- y, si falla, OSRM uno a uno. Un corte que no logre enlazar ninguno de los dos se dibuja como interrupcion, nunca como recta.

## Un aviso cada vez

Sobre el mapa pueden coincidir tres cosas: el aviso de sentidos y restricciones, el que marcó quien conduce y la tarjeta de desvío. Apilarlos no cabe -con la cabecera, la hoja de datos y los mandos no queda sitio en un teléfono- y al volante tampoco se atienden tres cosas a la vez, así que se enseña el más urgente y los demás esperan. El orden es: te has salido del recorrido, restricción de la vía, aviso tuyo; si te has salido, lo demás ya no es lo que toca decidir. Ninguno se pierde: todos se vuelven a evaluar en cada actualización de la posición, así que en cuanto el de delante desaparece sale el siguiente.

El que se enseña se coloca debajo de la cabecera y de la ficha de la vía, y si llegase a los mandos del mapa -velocímetro, orientación, voz, centrar- sube lo justo para no taparlos. Se coloca en el mismo momento de aparecer, no en el fotograma siguiente, para que no se le vea saltar de sitio.

## Chequeo antes de salir

Al pulsar Iniciar navegación aparece una tarjeta con el estado real del turno: Ruta, GPS, Voz, Mapas y Restricciones. No bloquea nada -la navegación arranca en ese mismo toque-, y por eso mismo tampoco pide un toque para quitarse: con todo en orden se retira a los tres segundos y con advertencias a los seis, que es de sobra para leer seis líneas cortas. Solo espera cuando hay algo que impide salir de verdad -sin ruta cargada, sin permiso de GPS-, porque ahí hay algo que hacer antes de moverse. El permiso de GPS se consulta al navegador, no se supone: distingue concedido, por pedir y denegado. El apartado de restricciones cuenta lo que depende del vehículo y deja fuera los avisos de sentido de circulación. Un sexto apartado cuenta los avisos propios que caen en esta ruta, y cuando no hay ninguno dice cuántos tienes guardados en otras, para que no parezca que se han perdido.

## Tus avisos en la ruta

La comprobación de alturas, pesos y accesos depende de que OpenStreetMap los tenga etiquetados, y en calles de pueblo casi nunca los tiene: en los 26 km de una ronda real, medidos bajando el perfil hasta 1,5 m y 1 t, no salta ni un aviso dimensional porque no hay ni una etiqueta. Quien conduce la ronda sí sabe dónde no cabe.

Marcar este punto guarda un aviso donde estás -o donde tengas puesto el control del recorrido- con un tipo: paso bajo, límite de peso, calle estrecha, prohibido el paso o una nota suelta, con hasta 80 caracteres de texto libre. Cada aviso se ata al recorrido una vez y después aparece en el mapa con su letra y sobre la conducción cuando faltan menos de 300 metros, contando hacia abajo; la voz lo dice una sola vez por vuelta, a 200 metros. Marcar dos veces el mismo punto no crea dos avisos: se queda el último con su nota, y altura y peso en el mismo sitio siguen siendo dos cosas distintas. Un aviso a más de 35 metros del trazado no se ata a él y se queda guardado para otra ruta que sí pase por allí.

El aviso dice siempre de dónde viene -«lo marcaste tú»- porque no es una comprobación: es memoria del conductor. Se guarda solo en este dispositivo, junto a la ruta y el progreso, y no se envía a ningún sitio.

Los avisos viajan dentro del GPX, como waypoints normales con un tipo propio (`rutas:altura`, `rutas:peso`…), el nombre legible y la nota en la descripción. Compartir GPX manda la ronda y lo aprendido en el mismo archivo, así que el compañero que la cubre mañana no empieza a ciegas, y cualquier otra aplicación que lea waypoints -OsmAnd, un Garmin- los enseña igual. Al cargar un GPX se recogen solo los waypoints con ese tipo: los de otras aplicaciones se dejan en paz, porque un waypoint cualquiera no es el aviso de nadie. Al importarlos vale la misma regla que al marcar a mano, así que cargar dos veces el mismo archivo no duplica nada y lo que ya tenías en ese punto se queda con la nota más reciente. Solo se exportan los avisos atados a la ruta que se comparte.

## Bajo consumo

Una jornada entera con el GPS activo, la pantalla encendida y el mapa 3D gasta batería. Cuando el navegador da el nivel de batería -Chrome en Android sí, Safari no- y el teléfono baja del 20 % sin estar cargando, se quitan las animaciones y el desenfoque de fondo de las tarjetas, y el mapa vuelve a 2D; por debajo del 10 % el aviso se marca en rojo. Enchufado no se ahorra nunca, que es como suele ir en la cabina. Sin dato de batería el único indicio fiable es el tiempo: a partir de 45 minutos de navegación seguida se reducen las animaciones, pero no se toca el 3D, porque no hay motivo para quitarlo. Si el sistema pide menos movimiento, se respeta siempre. Volver a 2D se hace una sola vez por cambio de estado: si el conductor reactiva el 3D, no se le insiste.

Lo que se quita es lo que obliga a recomponer capas en cada fotograma, no lo que se ve: los textos, los colores y los tamaños siguen igual. El ahorro real depende del teléfono y no se mide aquí; lo comprobado es que el estado cambia cuando debe y suelta cuando debe.

## Sin conexión

Las teselas del mapa 3D se guardan igual que las del 2D, asi que cambiar de vista sin cobertura ya no deja la pantalla en blanco. Un service worker guarda la aplicación entera -código, estilos, Leaflet y los iconos- la primera vez que se abre, así que arranca sin cobertura. Las teselas del mapa se guardan solo cuando el mapa las ha pedido de verdad, mientras exploras la ruta o conduces, con un tope de 1500: no hay descarga por lotes, que es lo que desaconseja la política de uso de OpenStreetMap. Preparar la ronda en el depósito, con datos, deja esas calles disponibles después. Una zona que no se haya visto nunca aparecerá vacía, y un aviso en pantalla lo indica mientras no haya conexión. Las consultas a Overpass nunca pasan por ese almacén: tienen su propia caducidad de 24 horas. La instalación pide cada archivo a la red y no a la caché del navegador: leyéndola, una versión nueva podía guardarse con un archivo viejo dentro y servirlo para siempre, porque después siempre responde desde su propio almacén.

El aviso de sin conexión dice qué seguirá funcionando, no solo que no hay red: «la ruta está guardada entera», «mapa guardado al 40 % de la ruta» o «esta zona no se ha visto todavía». La medida recorre puntos repartidos por el recorrido y da por cubierto el que tenga una tesela guardada a un zoom utilizable: la suya, una hasta dos niveles por encima -borrosa pero legible- o una más detallada de cuando se pasó por allí. Ampliar tres niveles o más es un borrón de color que no guía a nadie, así que no cuenta. Solo se miran las teselas del mapa 2D: el satélite numera los ejes al revés y las vectoriales del 3D son otro dibujo.

En pantallas de telefono la cabecera se reduce y la explicacion de portada se oculta -sigue entera en la pestana Guia-, las pestanas se acortan y quedan fijas arriba, y todo lo que se toca mide al menos 44 px. Los campos usan 16 px para que iOS no haga zoom al enfocarlos. Con eso la primera pestana aparece a 61 px del borde en vez de a 178, y el mapa entra en pantalla sin desplazarse.

La aplicación se puede instalar en la pantalla de inicio con su manifiesto e iconos. Una versión nueva se descarga en segundo plano y entra al cerrar y volver a abrir, para no cambiar el código a mitad de una ronda.

## Comprobación de sentidos

En Navegar, Comprobar mi recorrido compara muestras de la traza con vías de OpenStreetMap, incluyendo oneway=yes, oneway=-1, rotondas y excepciones para vehículos a motor. Las restricciones variables y las vías cercanas ambiguas se señalan aparte. No es una validación legal ni sustituye la señalización. No revisa obras ni prohibiciones de giro. Si rellenas las medidas de tu vehículo -altura, peso y anchura, opcionales y guardadas en el dispositivo- se comprueban además maxheight, maxweight y maxwidth, con la variante :hgv por delante de la general, y las vías cerradas por hgv, access o motor_vehicle. Un límite solo salta cuando tu vehículo no cabe, y el aviso dice la medida de la vía y la tuya. Sin medidas, esa parte no se comprueba y no aparece ningún aviso dimensional. access=destination no se señala: una ronda de recogida entra legítimamente en esas calles.

Las medidas se eligen con un preajuste -Furgoneta, Camión 12 t, Camión 18 t- o se escriben a mano, y se guardan en el dispositivo. Debajo se leen como una ficha: «3,6 m alto · 2,55 m ancho · 12 t». Arriba del recorrido, junto a su nombre, aparece el recuento de lo que depende del vehículo: «4 posibles incompatibilidades con tu vehículo», y al pulsarlo se abre la lista y lleva a los tramos. Ese recuento deja fuera los avisos de sentido de circulación, que no dependen de las medidas. Cambiar de preajuste vuelve a evaluar los datos de calles ya descargados sin pedirlos otra vez. Sin medidas no se afirma nada: solo se invita a ponerlas.

Se muestra la fecha de los datos, cobertura de coincidencia, señales sobre el mapa, enlaces a las fuentes y un informe CSV descargable. Cada aviso puede marcarse como revisado: ese tramo queda silenciado en el mapa, en el panel, en el banner y en la voz, y el informe CSV recoge su estado. Cuando la ronda repite una calle, un segundo botón silencia de una vez todos sus tramos, sin extender el silencio a un conflicto nuevo que aparezca más adelante en esa misma vía. Así solo hablan los avisos que aún no ha mirado nadie. La marca se guarda en el dispositivo junto a la huella de la ruta, sobrevive a nuevas consultas y se revierte desde el mismo botón. Un posible conflicto tiene prioridad sobre el aviso de giro. La consulta envía a Overpass solamente el rectángulo de la zona, sin puntos ni tiempos del GPX. Los datos se guardan durante 24 horas en el navegador para evitar consultas repetidas. Al guardar una consulta nueva se borran las caducadas y solo se conservan las dos ultimas, porque cada una pesa mas de un megabyte y en iPhone el almacen ronda los cinco. Servidores: overpass-api.de y, si no responde, overpass.kumi.systems de Private.coffee, probados en ese orden con 25 segundos cada uno. Una respuesta vacía se trata como fallo y pasa al siguiente: un servidor que solo sirve otra región contestaría sin calles, y eso diría «no hay conflictos» sin haber comprobado nada. Datos © OpenStreetMap contributors, ODbL. Las rutas personales y sus informes no están incluidos en el repositorio.

Si el servidor público falla, Cargar datos de calles permite importar un JSON de Overpass (out tags geom) y realizar la misma comprobación local, mostrando siempre la fecha de sus datos. El JSON también permanece en el dispositivo.

## Vista de conducción

Iniciar navegación abre el mapa a pantalla completa con una franja superior negra: flecha del giro, distancia en grande y nombre de la calle de destino cuando OpenStreetMap lo ha podido identificar. Abajo, una hoja con el tiempo que queda, la hora de llegada y la distancia, la barra de avance y la siguiente parada de la ronda. El velocímetro es el círculo de la esquina inferior izquierda.

En horizontal, para el soporte del coche, esas dos franjas se apilan en una columna a la derecha y el mapa se queda entero a la izquierda: en una pantalla de 375 px de alto la franja superior y la hoja inferior dejaban 215 px de mapa. Los mandos -salir, 2D/Satélite/3D, orientación, voz, centrar, velocímetro y repetir indicación- pasan al lado del mapa, y los avisos de desvío, de restricción y el chequeo de salida se quedan a la izquierda de la columna. El manifiesto ya no fuerza vertical.

El tiempo restante no se estima por velocidad sino con las horas del propio GPX: el recorrido grabado ya sabe cuánto se tarda desde cada punto hasta el final, incluidas las paradas. Si el GPX no trae horas se recurre a la velocidad del GPS.

Con esas mismas horas, la cuarta casilla de la hoja dice el ritmo: «A tiempo», «−3 min» o «+12 min» contra la grabación. Se compara el tramo recorrido desde que arrancó el GPS, no la jornada entera, para que un descanso con el GPS parado no falsee el número; el punto de partida es donde estaba el vehículo al arrancar, no el inicio del GPX. El tiempo grabado en un punto intermedio se interpola por distancia entre los dos puntos que lo rodean, igual que la posición, porque quedarse con el punto más cercano saltaría de golpe lo que separe a dos marcas de tiempo. Menos de dos minutos de diferencia se dan por «a tiempo»: por debajo de eso es ruido, no retraso. Si el GPX no trae horas no hay con qué comparar y la casilla lo dice en vez de inventar una cifra.

El botón N orienta el mapa a la marcha en vez de al norte. Al girar teselas de imagen giran también sus rótulos, así que los nombres de calle salen inclinados: por eso es un interruptor y no el comportamiento fijo. La cámara sigue el GPS y ajusta el zoom según la velocidad. Arrastrar el mapa suspende el centrado hasta pulsar Volver a seguir. La vista incluye controles de voz, repetir indicación y Finalizar. Los avisos de sentido contrario permanecen visibles y se apoderan de la franja superior. Al detenerse, llegar al final o denegarse el GPS, se vuelve a la vista normal.

## Continuidad del recorrido

El seguimiento tiene en cuenta el rumbo cuando es fiable para distinguir ida y vuelta. El avance se guarda localmente con una huella de las coordenadas y su orden: una ruta invertida no recupera el avance de la original. Continuar desde… selecciona el punto guardado; no inicia el GPS sin pulsar Iniciar navegación. Buscar mi pasada ofrece hasta cinco posiciones cercanas dentro del recorrido para elegir explícitamente cuando se repiten calles.

Ambas comprobaciones -sentidos y nombres de calle- comparten una misma rejilla espacial de las vias descargadas, de modo que cada muestra solo examina las vias de su celda en vez de todas. Al comprobar los datos de calles o importar el JSON de calles, las indicaciones incorporan nombres de vías si hay una coincidencia geométrica suficientemente clara antes y después de la maniobra. Las curvas dentro de la misma calle se distinguen de los giros; las indicaciones sin una correspondencia clara siguen marcadas como estimadas del GPX. No es un motor de rutas sobre la red viaria. Los puntos originales, sus pasadas y los avisos de sentido contrario se conservan: no se recalcula ni se desvía la ruta.

## Revisión de navegación

La cabecera pausa las indicaciones cuando el GPS no es fiable y muestra el tipo concreto de restricción que se aproxima. Al salir de la conducción, el mapa recupera el norte. Invertir una ruta conserva sus paradas y permite estimar la duración a partir del registro original.

Los avisos revisados se guardan por tramo y tipo: silenciar un aviso de sentido no silencia uno de peso en la misma calle. Las marcas antiguas sin tipo deben revisarse de nuevo. Cambiar de ruta descarta los datos de calles asociados a la anterior. Las excepciones de acceso más específicas prevalecen sobre las generales.

Cuando hay una versión preparada aparece «Nueva versión · actualizar». Solo se aplica al pulsar el botón con la navegación detenida. La limpieza de versiones anteriores conserva las cachés de otras aplicaciones del mismo dominio.

## Mapa 3D de calles

El selector 2D / 3D activa un segundo renderizador con MapLibre GL JS 4.7.1 (licencia BSD incluida) y el estilo Liberty de OpenFreeMap. Ofrece calles rotuladas, edificios con volumen donde existen datos y una cámara a 55 grados. La primera activación carga el motor y las teselas de OpenFreeMap se solicitan solo al abrir esta vista. Se guardan igual que las del 2D, en el mismo almacén y con el mismo tope de 1500: una zona vista con cobertura vuelve a estar disponible sin ella, y las dos vistas compiten por ese tope, así que explorar mucho en 3D puede desalojar teselas del 2D. La traza GPX no se envía al proveedor: solo se piden las teselas del área visible.

El seguimiento, los giros y las restricciones siguen dependiendo del mismo GPX y del mismo motor de navegación. Ambas vistas comparten posición, avance y avisos revisados; cambiar de vista no recalcula la ruta. Al iniciar navegación desde 3D se activa la orientación a la marcha; el botón de orientación permite volver al norte. Arrastrar suspende el seguimiento y Centrar GPS lo recupera. Una falta de soporte gráfico, pérdida del contexto WebGL o carga inicial agotada devuelve al mapa 2D.

Fuentes de integración: https://openfreemap.org/quick_start/ y https://maplibre.org/maplibre-gl-js/docs/examples/display-buildings-in-3d/ . El volumen de los edificios es cartográfico; Satélite es una capa independiente de imágenes de Esri.

Validación: carga real de calles y edificios, GPS simulado con rumbo, pausa y recuperación de cámara, cambio 2D/3D durante navegación, avisos sobre el mapa y limpieza al cambiar de ruta. Verificado también el retorno a 2D sin WebGL y las 94 pruebas del motor existente. Pendiente la comprobación de rendimiento con GPS real en el teléfono.

## Llegar al comienzo

Al iniciar, la primera posición GPS reciente con precisión de 60 metros o mejor se compara con el punto seleccionado del GPX. Si queda a más de 100 metros en línea recta, se detiene el seguimiento sin avanzar por la traza y se ofrece llegar con Google Maps. El botón Llegar al inicio permite abrir este acceso antes de activar el GPS. Si se ha elegido una pasada posterior, ese punto es el destino.

El enlace usa Maps URLs (https://developers.google.com/maps/architecture/maps-url), modo driving y dir_action=navigate; omite el origen para que Google Maps utilice la ubicación del dispositivo. Solo incluye el destino, nunca el GPX completo. Dependiendo del dispositivo y de la ubicación disponible, Google Maps abre navegación o vista previa. No es un itinerario adaptado a las dimensiones del camión. Al regresar a Rutas hay que pulsar Iniciar navegación; no se inicia automáticamente ni se altera el recorrido.

Comprobado en navegador con GPS simulado: lejos no avanza el GPX, cerca comienza el seguimiento, baja precisión mantiene la espera, cambiar la pasada actualiza el destino y Escape cierra el diálogo. Las 39 pruebas existentes siguen pasando.

### Volver del acceso

Al abrir Google Maps se guarda localmente la huella de la ruta y el punto seleccionado, durante un máximo de 24 horas. La tarjeta «Tu ruta te espera» sobrevive a una recarga. «Ya he llegado · comprobar GPS» recupera ese punto y solicita una posición fiable antes de comenzar; no inicia nada automáticamente al volver a la app. El recordatorio se borra al comenzar cerca del destino, al descartarlo, al cambiar a otra ruta o al caducar.

La carga inicial del mapa 3D mantiene visible el mapa 2D, señala que está cargando y permite cancelar y reintentar. Validado en navegador con respuesta de cartografía retrasada y con GPS simulado para regreso cercano y lejano después de recargar la página.

### Indicaciones y cartografía más legibles

La cabecera de conducción dice lo mismo que un GPS de coche y en el mismo orden: flecha grande, «EN 125 m», «Gira a la izquierda» y debajo la calle; más abajo y en pequeño, «Después: …». La fase -«próxima maniobra», «prepárate para el giro»- ya no ocupa sitio, porque repetía lo que dice la distancia; solo queda arriba cuando aporta algo, en un acceso por calles o con el GPS perdido. «Ahora» sustituye a la distancia al alcanzar el umbral de la indicación.

Las distancias se redondean como las dice un navegador -escalones de 10, 25, 50 y 100 metros según la cercanía-, y la voz usa ese mismo redondeo: si la pantalla dice 70 m, la voz dice 70 m. Las indicaciones sacadas del GPX vienen como sustantivo, «Giro a la derecha», y se muestran en imperativo, «Gira a la derecha», con la misma conversión en pantalla y en voz. Cuando OpenStreetMap no da nombre de calle, la línea de destino lo dice -«Según el GPX»- sin ocupar el sitio de la acción. La voz utiliza acciones directas y, cuando hay otro giro a 100 metros o menos del actual, lo anticipa al anunciar la maniobra inmediata. Estas indicaciones siguen siendo estimaciones de la geometría del GPX. Los avisos de restricciones tienen prioridad, y una pérdida de precisión GPS limpia las instrucciones secundarias.

El mapa 3D oculta inicialmente las capas de lugares y comercios; el botón Lugares permite recuperarlas y conserva la elección en el dispositivo. Los nombres de calles y las flechas de sentido siguen presentes. El recorrido lleva un contorno blanco y los edificios son más suaves. La posición de los controles se adapta a la altura real de la cabecera.

Verificado con las 94 pruebas del motor, GPS simulado, dos giros próximos, voz, GPS impreciso, visibilidad de etiquetas, seguimiento 3D, restricciones y cambio de ruta.

## Biblioteca privada de rutas

Mis rutas permite guardar explícitamente varios recorridos en IndexedDB, buscar por nombre, renombrar, abrir y eliminar con opción de deshacer mientras permanece abierta la sesión. Los archivos no se envían a servidores. El navegador puede borrar su almacenamiento; hay que conservar los GPX originales como copia. Olvidar la última ruta y eliminar una copia de la biblioteca son acciones distintas.

Se conservan todos los segmentos, el segmento seleccionado, los tiempos y el sentido actual de ese segmento. Una huella SHA-256 de los puntos completos evita duplicar exactamente la misma ruta. Volver a guardarla actualiza la copia y conserva el nombre elegido. La distancia mostrada corresponde al segmento guardado como seleccionado. Cambiar de ruta desde la biblioteca está bloqueado mientras el GPS de navegación está activo.

Verificado en navegador: guardar, deduplicar, renombrar, buscar, abrir la geometría original, recargar y recuperar, eliminar y deshacer; también un archivo con varios segmentos, seleccionado e invertido, conservando sus marcas de tiempo.

## Compartir un GPX

Compartir archivo GPX genera un documento GPX 1.1 real con todos los puntos del recorrido seleccionado, alturas y horas válidas. En móviles compatibles abre el menú del sistema para enviarlo como archivo por WhatsApp, correo u otra aplicación. Si el navegador no admite compartir archivos, Guardar GPX descarga el mismo documento para adjuntarlo manualmente.

El enlace web permanece como opción secundaria. Algunos servicios de mensajería recortan los enlaces largos, por lo que el archivo GPX es la opción recomendada y conserva mejor el recorrido completo. El nombre se limpia para producir un archivo terminado siempre en `.gpx`; el contenido escapa los caracteres XML y valida las coordenadas antes de compartir.

Validado con HICHAM en el dispositivo: 4.933 puntos y todas sus marcas de tiempo en un XML GPX 1.1 válido. También se verificaron el menú de compartir, la descarga alternativa y la reapertura del enlace web secundario.

## Navegación interna hasta el recorrido

Guiarme en Rutas calcula un acceso temporal para coche desde la posición actual hasta el punto elegido del GPX mediante OSRM / FOSSGIS. Solo salen del dispositivo esas dos coordenadas; el GPX completo no se envía. El acceso aparece en los mapas 2D y 3D con nombres de calles, maniobras y voz. Puede cancelarse o recalcularse, y al llegar se recupera el GPX original en el punto seleccionado.

La recuperación de un desvío utiliza el mismo sistema: después de dos posiciones fiables fuera de la traza, busca entre los siguientes 100 y 1.500 metros del orden del GPX y favorece el punto futuro más próximo sin saltar una vuelta lejana. El conductor decide si calcula el regreso, en una tarjeta con dos salidas del mismo tamaño: «Te has salido 84 m», y debajo «Volver a la ruta» o «Seguir sin recalcular». Mientras calcula dice «Buscando el mejor punto para volver…» y la segunda opción pasa a ser Cancelar, que devuelve la tarjeta al estado anterior sin dar el cálculo por fallido. Si el servicio no responde, ofrece Reintentar sin cerrar la puerta a seguir sin recalcular. Al aceptarlo, el acceso temporal se guía por calles y al llegar continúa la ronda desde ese punto. El cálculo es para coche y no aplica las dimensiones del camión.

Este acceso no considera altura, peso ni anchura del vehículo. El GPX guardado y su progreso no se sustituyen por el trayecto calculado. Se conserva Google Maps como alternativa si el servicio de cálculo no responde.
