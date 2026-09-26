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

## Vista de calle con fotografías reales

Junto a **2D · Satélite · 3D**, sobre el mapa, hay un botón **📷 Calle**: es un modo de vista más y está donde se buscan los modos de vista. Elegir un mapa lo apaga. El control completo -con los tres modos y los botones de recorrer la secuencia- está en el panel del simulador.

Dentro del simulador, **Vista de calle** intenta enseñar una fotografía real tomada cerca del punto por el que avanza la simulación. Tres modos: **Mapa** (solo el mapa de siempre), **Calle** (intenta la foto) y **Automático** (foto donde la haya, mapa donde no). La elección se guarda en el dispositivo.

**Sin claves ni tokens, y sin registro.** Se usan dos servicios públicos, por este orden:

- **KartaView** · `POST https://api.kartaview.org/1.0/list/nearby-photos/` con `lat`, `lng` y `radius`. Sin autenticación. Devuelve `sequence_id`, `sequence_index`, `heading`, `shot_date` y `username`; las imágenes cuelgan de `https://kartaview.org/` + la ruta que da el campo `name`. Atribución: autor y KartaView (CC BY-SA).
- **Panoramax** · `GET https://api.panoramax.xyz/api/search?bbox=…`, API STAC pública sin token. Devuelve `view:azimuth`, `datetime`, `collection`, `geovisio:rank_in_collection`, `geovisio:producer`, la licencia de cada foto y los enlaces `hd`/`sd`/`thumb`.

**Cómo se elige la foto.** No vale la más cercana sin más: en una carretera de doble sentido, la foto de la otra mano está igual de cerca y mira al revés. La puntuación suma la distancia en metros más la diferencia de rumbo pesada a la mitad -180° de desvío cuestan lo mismo que 90 m- y resta diez metros si la foto sigue en la secuencia que ya se venía viendo. Se descarta lo que esté a más de 60 m o mire a más de 135° del rumbo de la ruta: una fotografía a 500 m no es mejor que no enseñar ninguna. La diferencia de rumbo se calcula por el camino corto, así que 355° y 5° distan 10°, no 350. Esto es lo que distingue la ida de la vuelta cuando la ronda repite calle.

**Pocas peticiones.** Cada búsqueda trae las fotos de alrededor y se camina por ellas mientras el vehículo siga cerca; solo se vuelve a preguntar al alejarse, y nunca antes de 45 m. Medido en una simulación real: cinco fotografías distintas a lo largo de 95 m con **una sola petición**. La imagen siguiente y la anterior se precargan, y se guardan como mucho 24 en memoria.

**Si no hay fotos**, dice «Sin imágenes de calle en este tramo» y ofrece **Verla en Google Street View**, que abre el mismo visor del control Street View en la posición actual. Ese es el último eslabón de la cadena: KartaView, Panoramax, Google y, si nada de eso, el mapa -volviendo al 3D si ya estaba cargado y funcionando-. El botón no aparece sin conexión ni si el visor de Google no está cargado: ofrecer una vista que luego no abriría sería peor que no ofrecerla. Tampoco se abre solo; manda el usuario. Sin conexión ni siquiera se pregunta a los proveedores: se apaga y lo dice. La simulación y la navegación no se detienen nunca por esto.

**Privacidad.** Las búsquedas de imágenes comparten únicamente una pequeña zona alrededor del punto actual -un cuadrado de unos 200 m de lado, o el punto y un radio-. El GPX completo permanece en el dispositivo: no se envían la traza, ni las horas, ni las paradas, ni la biblioteca, ni el perfil del vehículo, ni el nombre del archivo.

**Cobertura.** Depende de lo que haya subido la gente, y se comprueba sola en cada punto. Medido al desarrollarlo: en Puig-reig y Gironella no había imágenes en ninguno de los dos servicios dentro de 300 m; en Berga sí -126 fotos en 900 m, una secuencia de 2015-. Que un pueblo no tenga fotos no es un fallo de la aplicación, y por eso existe el paso a Google: comprobado que en Puig-reig, donde los dos servicios libres están vacíos, Google sí tiene panorámica de la calle.

## Auditor de pantalla

Dentro del simulador, el botón **Auditar pantalla** recorre todos los controles de la página y le pregunta al navegador, con `elementFromPoint`, quién recibe el clic en el centro de cada uno. Además compara **las cajas enteras** de las capas que flotan sobre el mapa -cartel de maniobra, tarjeta de la calle, aviso de vía, barra de vistas, mandos, velocímetro, zoom-, porque mirar solo el centro de cada control no basta: una tarjeta puede cubrir media barra de botones sin tocar ningún centro. Eso fue exactamente lo que pasó, y el auditor decía «sin problemas». Ahora dice «barra de vistas — tapado por tarjeta de la calle (242×36 px)», con los píxeles. Tapar algo que advierte o algo que se pulsa es grave; dos paneles de datos rozándose se cuenta aparte. Señala dos cosas: lo que no se alcanza -un control fijo fuera de la ventana- y lo que está tapado por otro. Distingue lo grave de lo que solo molesta: un control fijo tapado por otro fijo no se destapa nunca, mientras que contenido de la página bajo un panel flotante se destapa bajando, y eso se cuenta aparte en vez de mezclarlo. Un auditor que grita por todo acaba ignorándose, y por eso también se le quitó un falso positivo suyo: con el mapa a pantalla completa daba por tapadas las cuatro pestañas de abajo, que están detrás del mapa a propósito. Ahora eso solo se perdona cuando quien tapa es el propio escenario; si lo tapa un panel flotante, sigue siendo un problema.

Existe porque tres fallos seguidos fueron del mismo tipo: un botón tapado o fuera de la pantalla en un tamaño que no se había probado. En su primera pasada encontró seis, uno de ellos recién introducido. Solo se carga con `?sim`, así que no pesa para quien conduce.

## Simulador de conducción

Abrir la aplicación con `?sim=1` añade un simulador que sustituye el GPS por una posición generada sobre el recorrido cargado. Solo aparece con ese parámetro y nunca sobrevive a una recarga: una posición falsa activada por descuido dentro de un vehículo sería peligrosa. Mientras corre, una franja roja avisa de que la posición no es real.

Pero desde el icono del móvil no hay forma de escribir eso: una aplicación instalada abre siempre la misma dirección. El interruptor **Modo simulación** vive dentro de **Ruta y ajustes**, que es un sitio al que hay que ir a propósito y desde el que se vuelve.

**La elección se recuerda.** Una vez encendido, cada apertura trae **Simular junto a Iniciar navegación** y se elige una cosa u otra sin volver a pasar por los ajustes. La dirección se queda limpia -manda lo guardado-, y `?sim` sigue valiendo para una sesión suelta sin cambiar la preferencia.

Disponible no es en marcha, y esa es la distinción que importa: la posición inventada **solo empieza al pulsar Simular**, nunca al abrir, y mientras corre hay una franja roja avisando de que la posición no es real. Lo que no puede pasar por descuido dentro de un vehículo es que se ponga a correr sola, y eso sigue sin poder pasar. Encender y apagar recarga la página, porque el simulador sustituye la geolocalización al arrancar y hacerlo a medias dejaría la página en un estado que no es ninguno de los dos.

Con el simulador puesto de forma permanente apareció un efecto que antes no existía: su panel flota abajo y, plegado, se quedaba **encima de «Iniciar navegación» y «Simular»** -21 px medidos-, y ahí no se destapa bajando, porque el panel es fijo y baja con la página. Ahora la página termina por encima de él.

El panel se pliega pulsando su título, y la elección se recuerda. Flota sobre la página y, abierto, tapa lo que tiene debajo: la pestaña Guía, el conmutador 2D/Satélite/3D y Ampliar mapa. Plegado ocupa 58 px y no tapa nada -comprobado midiendo qué elemento recibe el clic en cada control de la página-. Además, en simulación el botón Ampliar mapa se aparta a la izquierda del mapa, porque la esquina inferior derecha es donde vive el panel.

La velocidad sube y baja con más y menos, por una escalera de 5 a 200 km/h con escalones finos abajo -5, 10, 15, 20- y gruesos arriba -80, 100, 120, 160, 200-. Encima hay tres **marchas con nombre** -🐢 Lento (10), Normal (50), 🐇 Rápido (120)-: pasar del ritmo de una recogida a recorrer un GPX largo eran ocho pulsaciones y ahora es una. La marcha puesta se ve marcada, y al ajustar a mano con más y menos deja de estarlo, porque ya no es ninguna marcha. Cada marcha cae en un escalón real de la escalera, así que más y menos siguen funcionando desde ella. Abajo se ve cómo se comportan los avisos parando y arrancando, al ritmo real de una recogida; arriba se adelanta recorrido sin esperar. Se puede cambiar con la simulación en marcha: cada paso lee la velocidad del momento. El panel nunca es más alto que la pantalla y, si no cabe, se desplaza dentro: en un móvil en horizontal medía 364 px en una pantalla de 375 y la fila de velocidad se salía por arriba, sin forma de verla. Reproducir abre el mapa a pantalla completa, que es para lo que se pulsa; en simulación el botón de Reducir mapa se aparta a la esquina superior izquierda, porque el panel del simulador ocupa la inferior derecha y lo tapaba entero.

Simular arranca también la navegación y abre el mapa a pantalla completa: la simulación sirve para ver la ruta en marcha, y tener que pulsar después «Iniciar navegación» y «Ampliar mapa» sobraba.

Y por eso **Parar también detiene la navegación**: si no, el GPS real tomaba el relevo desde donde estuviera el vehículo de verdad -normalmente lejos del recorrido- y la posición saltaba. Desde fuera eso se ve como si la simulación volviera al principio. Ahora el recorrido se queda parado en el punto al que llegó, y volver a pulsar Simular sigue desde ahí. Medido: parada a 153 m, y al reanudar arrancó en 194 -no en cero-. Vale igual desde el botón de arriba y desde el Parar del panel.

**Simular** está además al lado de **Iniciar navegación**, que es donde se busca; el mismo botón para y arranca, y dice cuál de las dos cosas hace. Sigue existiendo solo con `?sim`: no puede aparecer en el móvil de quien conduce de verdad. Sin GPX cargado, el panel se abre solo para que se lea el motivo, que antes quedaba escrito dentro de un panel plegado.

Al arrancar, el panel se pliega para dejar ver el mapa, pero **plegado en marcha no es esconderlo todo**: se quedan velocidad, avance y Parar, y se va el resto. Antes arrancar escondía justo los mandos que se tocan mientras se mira la ruta.

Aun así ocupaba un cuarto de la pantalla, justo encima del camión. Ahora, en marcha, hay **dos tamaños y los elige quien conduce**, tocando la cabecera:

- **Reducido** -como arranca-: dos filas, velocidad arriba y las marchas junto a Parar abajo. 144 px, el 22 % de una pantalla de 667. Los seis mandos a 44 px, que al volante 29 no se aciertan.
- **Mínimo**: solo la cabecera, 36 px, el 5 %. La velocidad no se pierde de vista porque va ahí: «EN MARCHA · 10 KM/H».

Para apretarlo se quitan las etiquetas «VELOCIDAD» y «AVANCE» -menos y más, y la tortuga y la liebre, se entienden solos-, el botón Simular, que en marcha está deshabilitado y solo estorba, y el título del panel, porque la franja roja de arriba ya dice que esto es una simulación. Al parar vuelve a ser abierto o cerrado, como siempre.

Permite elegir velocidad -30, 50 u 80 km/h-, calidad de señal, desvío lateral de 50 o 100 metros y simular la falta de Internet. La señal irregular introduce ruido y pierde una posición de cada ocho; la mala llega a 65 metros de imprecisión, por encima del umbral con el que la navegación deja de fiarse, y pierde una de cada tres. El desvío aparta la posición en perpendicular a la marcha, sin inventar calles.

Como no toca la navegación sino la fuente de posiciones, lo que se prueba es exactamente el mismo código que corre en la carretera: emparejado, giros, voz, paradas, avisos de desvío y comportamiento sin cobertura.

## Comprobaciones

`node --test tests/*.cjs`

Las mismas pruebas corren también en el navegador, sin node instalado: **[tests/run.html](tests/run.html)**, o `https://appsjcm.github.io/rutas/tests/run.html` desde el propio móvil. No duplica ni un caso: lee los `.cjs` tal cual y les da un `require` que devuelve los módulos ya cargados como scripts y un `node:assert/strict` compatible. Dice cuántas pasan, deja ver solo los fallos con el valor que llegó frente al esperado, y copia el informe en texto.

Ese assert vive en `tests/assert-shim.js` y lo comprueba `tests/shim.test.cjs`, que no lo usa para dar sus propios veredictos -si estuviera roto y no saltara nunca, una prueba escrita con él pasaría vacía-. Bajo node, cada caso se contrasta además contra el `assert` de verdad, así que una divergencia se ve ahí. Comprobado rompiendo una aserción a propósito y pidiendo un módulo inexistente: las dos salen como fallo con su mensaje, no en silencio.

El service worker no toca `/tests/`: la estrategia es cache-first para todo el origen, y servir una prueba vieja diría que todo va bien sin haber comprobado nada. Se descubrió justamente así, midiendo por qué un fichero recién roto seguía pasando.

`tests/fuentes.test.cjs` comprueba que **todo lo que se publica se lee como JavaScript**: cada `.js` del `SHELL` del service worker y cada `<script>` de dentro de `index.html`. Existe porque un paréntesis de más en ese script dejó sin funcionar el mecanismo de actualización entero -la aplicación seguía abriéndose, así que no se notaba- y ninguna prueba lo vio: las demás solo cargan los módulos `-core`. La lista sale del propio `SHELL`, así que no hay una segunda lista que mantener, y de paso se comprueba que el `SHELL` no nombra ficheros que no existan. Comprobado rompiendo `index.html` y `pace.js` a propósito: los dos salen nombrados, con el bloque exacto.

Compartir ruta genera un enlace que lleva la ronda entera dentro: las coordenadas van codificadas y comprimidas en la parte del enlace que nunca viaja al servidor, asi que no se sube nada a ningun sitio. La ronda de ejemplo con la que se prueba, 26 km y 4933 puntos, cabe en unos 9 KB de enlace. Quien lo abre ve la ronda cargada y guardada en su dispositivo. El codigo QR tiene mucha menos capacidad: si la ronda no cabe se ofrece una version aligerada, diciendo cuantos puntos conserva y con cuanta desviacion, y el enlace sigue llevando la version completa. El codificador redondea a cinco decimales, unos 30 cm, asi que la distancia total puede variar medio punto porcentual.

Publicación mediante GitHub Pages desde main.

## Servicios de calles

Reconocer las calles del GPX lo hace Valhalla de FOSSGIS. No tiene reserva para esa tarea: el OSRM publico limita el emparejado a diez coordenadas por peticion, asi que cubrir una ronda costaria unas doscientas peticiones. Si Valhalla no responde no hay trazado vial y la navegacion se queda con el GPX original, que es el comportamiento seguro.

Enlazar los cortes si tiene reserva, porque ahi basta con dos puntos por peticion: primero Valhalla en lotes de cinco cortes -admite diez localizaciones y cada corte gasta dos- y, si falla, OSRM uno a uno. Un corte que no logre enlazar ninguno de los dos se dibuja como interrupcion, nunca como recta.

**Se navega por calles donde coinciden con tu GPX, y por tu GPX solo en los tramos que las calles se saltan.** Cuando se usa el trazado por calles, la navegación lo sigue a él y no al GPX: rodea las rotondas y da las maniobras viales. Pero tiene que pasar por donde pasa la ronda, y solo se comprobaba que fuera continuo y midiera parecido. Con la ronda larga de prueba -un GPX sintético que no sigue calles- se aceptó un trazado del que el 38 % del GPX quedaba a más de 200 m. La cobertura que ya se calculaba no lo veía: mira 160 muestras, una cada 700 m en esa ronda, y entre dos cabe un callejón sin salida que el reconocimiento se salte.

La primera corrección fue descartar el trazado entero si se apartaba en algún sitio, y fue peor: un solo tramo dudoso en 110 km dejaba toda la ronda navegando por el GPX, que cruza las rotondas por el medio -así llegó, con una captura de la rotonda de la C-16 en Puig-reig-. Ahora se miran todos los puntos del GPX contra el trazado, en orden -una ronda pasa varias veces por la misma calle, y cada pasada tiene que ir con la suya-. Donde el GPX se aparta más de 45 m durante más de 100 m seguidos, esa parte se navega por el GPX y el resto por calles; cada unión es la perpendicular desde el último punto del GPX que aún estaba cerca, así que mide como mucho 45 m. Lo que se aparta menos -una rotonda cortada por el medio, el ruido del GPS- se queda con las calles. Las maniobras de Valhalla se recolocan sobre la línea nueva, y en los tramos del GPX se sacan del propio GPX. Probado sobre las carreteras reales de la ronda larga: con un GPX denso que se mete en un callejón y en un patio, se sigue el GPX en esos dos tramos (181 y 321 m) y calles en todo lo demás; con uno de pocos puntos que corta las rotondas, calles en toda la ronda. 40 ms para 110 km. Solo si las calles coinciden con menos de la mitad del GPX -el reconocimiento no ha entendido la ronda- se navega todo por el GPX.

**El avance guardado cae en el mismo sitio aunque cambie la línea.** Se guarda como distancia sobre la línea que se seguía, y el GPX y el trazado por calles miden distinto: leído sobre la otra, «Continuar desde 100 km» caía casi 3 km antes. Ahora se guarda también cuánto medía aquella línea y dónde estaba el punto, y al recuperarlo se traslada a la de ahora: en proporción y luego al paso por ese sitio que caiga más cerca, porque una ronda pasa varias veces por la misma calle. El avance guardado con versiones anteriores, que no lleva esos datos, se midió sobre las calles, que era lo que se navegaba: se traslada una vez a la línea que se navega ahora.

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

## Lo que se carga y cuándo

La primera visita pide 481 kB en 61 peticiones. Dos cosas se quedaron fuera de esa carga porque casi nadie las usa y pesaban en todas: la hoja de estilo del motor 3D -64 kB, que se cargaba siempre aunque su propio motor ya se pedía solo al abrir la vista 3D- y el generador de códigos QR -6 kB de otro servidor-. Ahora la hoja viaja con el motor y el generador se pide cuando alguien pide un QR. Son 94 kB y cinco peticiones menos en cada visita, sin perder nada: al abrir el 3D la hoja llega con él, y al pedir un QR el generador llega antes de dibujarlo.

El resto de la carga es lo que hace falta desde el primer momento: Leaflet -144 kB- para el mapa, el motor de navegación y las hojas de estilo propias. Los archivos van sin minificar a propósito: el código se lee, y quien mantenga esto tiene que poder abrirlo y entenderlo.

## Cómo llega una versión nueva

El service worker sirve desde su propio almacén, así que una versión recién publicada no entra sola: hay que aplicarla. **En el móvil no se actualizaba**, y eran tres cosas a la vez.

La primera y la que más pesaba: **nadie preguntaba**. Una aplicación instalada en la pantalla de inicio se abre y se cierra sin navegar a ninguna página, y entonces el navegador no vuelve a pedir `sw.js` por su cuenta. Sin un `registration.update()` explícito, podía pasar días sin enterarse de que había versión nueva. Ahora se pregunta en cinco momentos: al abrir, al volver a la aplicación (`visibilitychange` y también `pageshow` con `persisted`, que es como llega en una aplicación instalada que se restaura de memoria), al recuperar el foco, **al volver la cobertura** -si se abrió sin red la consulta falló, y reconectar es la señal que de verdad ha cambiado, así que esa no espera plazo- y cada quince minutos. Nunca más de una vez por minuto y nunca navegando. El registro va con `updateViaCache:'none'`, para que `sw.js` no se lea jamás de la caché del navegador.

La segunda: la versión nueva solo se aplicaba sola dentro de los **treinta segundos** siguientes a abrir la página, y bajar setenta ficheros por datos móviles tarda más que eso. Pasado el plazo quedaba solo el botón «Nueva versión · actualizar», que además está oculto a pantalla completa, que es donde se pasa la jornada. Ahora se aplica siempre que no se esté navegando; con el GPS en marcha se espera, porque recargar con el camión en marcha sí sería peor, y se aplica en cuanto se detiene la navegación.

La tercera: `ready()` se rendía si todavía no había controlador, y no volvía a mirar. Si la versión nueva ya estaba esperando desde antes de cargar la página, `updatefound` no volvía a dispararse y se quedaba en cola para siempre. Ahora se repasa también al tomar el control y unas cuantas veces al arrancar.

**La versión se ve.** Al final de la pestaña Guía: «Versión instalada: rutas-…-v112», que es la que sirve los archivos de verdad -la dice el propio service worker-, con un botón **Buscar actualización** que contesta «Ya tienes la última versión» o avisa de que hay una nueva. Sin eso, «no se actualiza» no había forma de comprobarlo: la pantalla es la misma lleve lo que lleve.

**Y se nota.** Después de la recarga que aplica una versión nueva aparece cinco segundos un aviso: «Rutas actualizada». Un mecanismo invisible que funciona se parece demasiado a uno roto.

Comprobado de punta a punta: con la v110 instalada se publicó la v111 y, sin pulsar nada, solo al volver a la aplicación, quedó la v111 sirviendo, la página recargada y la caché anterior borrada. Y después, tres saltos seguidos -v115→v116→v117→v118- aplicándose solos, dos de ellos disparados por el evento de reconexión.

### Cuando ya se ha quedado atrás

Ese arreglo no puede aplicarse a sí mismo: un teléfono que lleva la versión anterior lleva precisamente el código que no sabe buscar. Y **borrar la caché del navegador no lo desatasca**, porque los archivos del service worker no están ahí: viven en Cache Storage, que es otro almacén, y en una aplicación instalada en la pantalla de inicio el navegador ni lo toca.

Para eso está **[reparar.html](reparar.html)**. Es una página suelta, sin un solo `<script src>`: si cargara los módulos de la aplicación, una versión rota se llevaría por delante la herramienta para arreglarla. Y funciona sobre una instalación vieja porque su URL es nueva: el service worker antiguo no la tiene guardada, así que la pide a la red.

Enseña qué versión hay guardada -el nombre del almacén la lleva dentro, así que se sabe aunque el service worker viejo no sepa contestar-, cuál está publicada, cuántos service workers hay registrados y si alguno espera turno. Debajo, dos botones: **Ponerla al día**, que pregunta por la versión nueva y la activa, y **Borrado completo**, que desregistra y vacía los almacenes de Rutas. Las rutas guardadas y el progreso no se tocan -comprobado-; lo que habrá que volver a descargar es el mapa de las calles.

Se llega desde la pestaña Guía, junto a la versión. El service worker no la guarda nunca, igual que `/tests/`: una herramienta para arreglar copias viejas que se quedara vieja ella misma sería el último chiste.

## Sin conexión

Las teselas del mapa 3D se guardan igual que las del 2D, asi que cambiar de vista sin cobertura ya no deja la pantalla en blanco. Un service worker guarda la aplicación entera -código, estilos, Leaflet y los iconos- la primera vez que se abre, así que arranca sin cobertura. Las teselas del mapa se guardan solo cuando el mapa las ha pedido de verdad, mientras exploras la ruta o conduces, con un tope de 1500: no hay descarga por lotes, que es lo que desaconseja la política de uso de OpenStreetMap. Preparar la ronda en el depósito, con datos, deja esas calles disponibles después. Una zona que no se haya visto nunca aparecerá vacía, y un aviso en pantalla lo indica mientras no haya conexión. Las consultas a Overpass nunca pasan por ese almacén: tienen su propia caducidad de 24 horas. La instalación pide cada archivo a la red y no a la caché del navegador: leyéndola, una versión nueva podía guardarse con un archivo viejo dentro y servirlo para siempre, porque después siempre responde desde su propio almacén.

El aviso de sin conexión dice qué seguirá funcionando, no solo que no hay red: «la ruta está guardada entera», «mapa guardado al 40 % de la ruta» o «esta zona no se ha visto todavía». La medida recorre puntos repartidos por el recorrido y da por cubierto el que tenga una tesela guardada a un zoom utilizable: la suya, una hasta dos niveles por encima -borrosa pero legible- o una más detallada de cuando se pasó por allí. Ampliar tres niveles o más es un borrón de color que no guía a nadie, así que no cuenta. Solo se miran las teselas del mapa 2D: el satélite numera los ejes al revés y las vectoriales del 3D son otro dibujo.

En pantallas de telefono la cabecera se reduce y la explicacion de portada se oculta -sigue entera en la pestana Guia-, las pestanas se acortan y quedan fijas arriba, y todo lo que se toca mide al menos 44 px. Los campos usan 16 px para que iOS no haga zoom al enfocarlos. Con eso la primera pestana aparece a 61 px del borde en vez de a 178, y el mapa entra en pantalla sin desplazarse.

La aplicación se puede instalar en la pantalla de inicio con su manifiesto e iconos. Una versión nueva se descarga en segundo plano y entra al cerrar y volver a abrir, para no cambiar el código a mitad de una ronda.

## Comprobación de sentidos

En Navegar, Comprobar mi recorrido compara muestras de la traza con vías de OpenStreetMap, incluyendo oneway=yes, oneway=-1, rotondas y excepciones para vehículos a motor. Las restricciones variables y las vías cercanas ambiguas se señalan aparte. No es una validación legal ni sustituye la señalización. No revisa obras ni prohibiciones de giro. Si rellenas las medidas de tu vehículo -altura, peso y anchura, opcionales y guardadas en el dispositivo- se comprueban además maxheight, maxweight y maxwidth, con la variante :hgv por delante de la general, y las vías cerradas por hgv, access o motor_vehicle. Un límite solo salta cuando tu vehículo no cabe, y el aviso dice la medida de la vía y la tuya. Sin medidas, esa parte no se comprueba y no aparece ningún aviso dimensional. access=destination no se señala: una ronda de recogida entra legítimamente en esas calles.

Las medidas se eligen con un preajuste -Furgoneta, Camión 12 t, Camión 18 t- o se escriben a mano, y se guardan en el dispositivo. Debajo se leen como una ficha: «3,6 m alto · 2,55 m ancho · 12 t». Arriba del recorrido, junto a su nombre, aparece el recuento de lo que depende del vehículo: «4 posibles incompatibilidades con tu vehículo», y al pulsarlo se abre la lista y lleva a los tramos. Ese recuento deja fuera los avisos de sentido de circulación, que no dependen de las medidas. Cambiar de preajuste vuelve a evaluar los datos de calles ya descargados sin pedirlos otra vez. Sin medidas no se afirma nada: solo se invita a ponerlas.

Se muestra la fecha de los datos, cobertura de coincidencia, señales sobre el mapa, enlaces a las fuentes y un informe CSV descargable. Cada aviso puede marcarse como revisado: ese tramo queda silenciado en el mapa, en el panel, en el banner y en la voz, y el informe CSV recoge su estado. Cuando la ronda repite una calle, un segundo botón silencia de una vez todos sus tramos, sin extender el silencio a un conflicto nuevo que aparezca más adelante en esa misma vía. Así solo hablan los avisos que aún no ha mirado nadie. La marca se guarda en el dispositivo junto a la huella de la ruta, sobrevive a nuevas consultas y se revierte desde el mismo botón. Un posible conflicto tiene prioridad sobre el aviso de giro. La consulta nunca envía a Overpass puntos ni tiempos del GPX. Lo que envía depende del tamaño de la ronda: **si cabe en un rectángulo de hasta 25 km², ese rectángulo**, que dice dónde está la zona y no por dónde pasa la ronda. Si no, **una cadena de cajas pequeñas a lo largo del recorrido**, de unos 2 km cada una y con 120 m de margen, que tampoco lleva puntos ni horas pero sí deja ver el trazado a grandes rasgos. Ese cambio se paga solo donde compra algo: con una ronda de 108 km el rectángulo medía 218 km² y traía 6024 vías y 7 MB -más de lo que cabe en el almacén de un iPhone, unos 5 MB, así que no se podía guardar y se pedía de nuevo en cada apertura-, de las que el comprobador solo usa 652, las que pasan a menos de 16 m. Con las cajas: 54 cajas, 66 km², 1497 vías y 1,8 MB, **en 8 segundos, con el mismo 99 % de coincidencia y sin que falte ninguna de las 652**. Por encima de 250 km² antes no se comprobaba nada; ahora ese límite se aplica a la superficie de las cajas, así que una ronda larga ya no se queda sin comprobar. Se descartó pedir un pasillo con `around`: una línea de 1254 puntos seguía ejecutándose en el servidor a los tres minutos. Una ronda larga va por POST, que es la forma que usa el ejemplo de la propia wiki de Overpass; una corta sigue yendo por GET como siempre, porque el servidor de reserva estaba caído el día de la prueba y no se pudo comprobar que acepte POST. Los datos se guardan durante 24 horas en el navegador para evitar consultas repetidas. Al guardar una consulta nueva se borran las caducadas y solo se conservan las dos ultimas, porque cada una pesa mas de un megabyte y en iPhone el almacen ronda los cinco. Servidores: overpass-api.de y, si no responde, overpass.kumi.systems de Private.coffee, probados en ese orden con 25 segundos cada uno. Una respuesta vacía se trata como fallo y pasa al siguiente: un servidor que solo sirve otra región contestaría sin calles, y eso diría «no hay conflictos» sin haber comprobado nada. Datos © OpenStreetMap contributors, ODbL. Las rutas personales y sus informes no están incluidos en el repositorio.

Si el servidor público falla, Cargar datos de calles permite importar un JSON de Overpass (out tags geom) y realizar la misma comprobación local, mostrando siempre la fecha de sus datos. El JSON también permanece en el dispositivo.

## Empezar donde quieras

La maquinaria para empezar a media ronda ya existía -el deslizador «Explorar el recorrido», «Buscar mi pasada», «Desde el inicio»- pero `premium.js` la mete dentro de **Ruta y ajustes**, y desde la pantalla principal no se veía ninguna. Estar y no poder llegar es, para quien la usa, lo mismo que no estar.

Debajo de los botones de la ruta hay ahora **Empezar en: El inicio · Donde estoy · Tocar el mapa**. Lo único que hace es mover el cursor; arrancar lo sigue haciendo «Iniciar navegación», que es donde la gente espera que se arranque. Y dice lo que va a pasar: «Empezarás en 527 m de 878 m. Lo anterior a ese punto quedará sin recorrer.»

**Y pregunta por qué pasada vas.** Una ronda de recogida sube y baja la misma calle, así que un toque en el mapa puede caer cerca de varias pasadas; quedarse con la más cercana en línea recta acierta la mitad de las veces. Medido con una ronda de dos calles: un toque a media ruta caía dentro de 60 m de **cuatro** pasadas, y la que se elegía a ciegas no era la que se había señalado. Ahora sale «Ahí el recorrido pasa 4 veces. Elige por cuál vas» con las cuatro -«Pasada 3 · 527 m»- y decide el conductor. Las candidatas las da `nav-core.nearbyPasses`, que ya existía para «Buscar mi pasada».

Con el GPS en marcha no se puede cambiar el punto: lo dice en vez de no hacer nada. Y si la precisión no llega para distinguir una calle de otra, o el punto está lejos del trazado, se dice el motivo -«Estás a 400 m del recorrido»- en lugar de un «no se pudo» que deja sin saber si esperar o probar otra cosa.

## Tramos sin pasar

El avance de la navegación es un solo número que solo sube -`progress = max(progress, d)`-, así que **saltarse una calle no dejaba rastro**: la ronda figuraba igual de completa. En una recogida puerta a puerta ese es el error que más cuesta, porque significa volver.

Ahora se apunta por dónde se ha circulado de verdad, como una lista de tramos sobre el eje de distancia del GPX. Que la ronda repita calles no estorba: cada pasada es un intervalo distinto de ese eje. Entre dos posiciones seguidas se da por recorrido lo de en medio mientras el salto sea razonable -150 m, que cubre perder el GPS unos segundos o ir rápido-; por encima de eso, lo saltado queda como hueco.

**Un hueco solo cuenta si tiene recorrido a los dos lados.** Lo que queda por delante del punto más lejano no es un tramo saltado, es ronda sin terminar, y decir lo contrario sería mentir. Y por debajo de 80 m no se avisa: gritar por cuarenta metros de ruido de GPS es la forma de que el aviso deje de leerse.

En la cabecera del recorrido, que se ve siempre, aparece «**1 tramo sin pasar · 426 m · ver en el mapa**», y los tramos se dibujan en rojo discontinuo sobre el mapa, que es donde se entiende de qué calle se trata. Al pulsarlo lleva al primero que falta.

Conduciendo no se mira la cabecera, se mira la carretera, así que **también se avisa por voz** en cuanto aparece un hueco nuevo, una vez y con los avisos por voz puestos. Se dice el total y no cuál: los bordes de un hueco cambian si luego se rellena en parte, así que llevar la cuenta de cuántos hay es lo único estable. Y no manda dar la vuelta: si volver o no lo decide quien conduce.

**El registro es de una ronda, no de siempre.** Sin eso, después de la primera vuelta completa todo quedaría cubierto y saltarse una calle mañana no se notaría: la función dejaría de servir justo cuando empieza a hacer falta. Una ronda es de un día -con la fecha local, que una salida a las seis de la mañana es de hoy-, y además empezar desde el principio, por debajo de 50 m, es empezar de nuevo aunque sea el mismo día. Un guardado de otro día, o uno viejo sin fecha, se descarta en vez de darlo por bueno: dar por recorrido lo que no se sabe sería tapar huecos. El registro va junto a la huella de la ruta, como el avance, así que cambiar de GPX cambia de registro.

Comprobado con el simulador: recorrido continuo hasta 300 m -sin huecos-, salto hasta 700 y continuación hasta el final; el aviso salió con el tramo 298-725 y el mapa lo dibujó.

**El final dice la verdad.** Al llegar con un tramo saltado, el cartel ponía «Recorrido completado» con un ✓ verde justo encima del aviso de que faltaba un tramo: dos cosas contrarias en la misma pantalla, y la que se lee de un vistazo era la falsa. Ahora, si falta algo, el cartel de conducción dice **FIN · 1 tramo sin pasar · 447 m · Marcados en rojo en el mapa** en el color de aviso, la línea de guía pone «!» en vez de ✓, el mensaje sale destacado y la voz lo añade: «Has llegado al final del recorrido. Atención. Te has dejado un tramo sin pasar, de 447 m.» Con la ronda completa sigue siendo el ✓ de siempre. Tampoco manda volver: dice dónde mirar.

**El chequeo de salida no salta al simular.** «Revisa esto antes de salir» se abre al pulsar «Iniciar navegación», y Simular pulsa ese mismo botón por dentro. En una simulación decía «GPS ✕ Permiso denegado», que es falso -la simulación no necesita el GPS-, y como un fallo no se cierra solo, se quedaba abierto hasta el final de la ronda. Ahora solo aparece al salir de verdad.

## Rondas largas

Casi todo se había probado con rondas de uno o dos kilómetros, y la de verdad pasa de los cien: «Parada 1 de 14 a 18,34 km · quedan 90,87 km». Se probó con una ronda rural de **111 km, 18 500 puntos y 14 paradas** -1,5 MB de GPX, un punto cada seis metros como graba un móvil-. Carga en 0,8 s y el ajuste a calles la deja en 7000 puntos.

Lo que no aguantaba bien era la **línea verde de lo recorrido**: crece desde el km 0 y se rehacía entera en cada posición, volviendo a proyectar todos sus puntos cada segundo. Pintar una posición costaba 2,8 ms en el km 1 y **16 ms en el km 100**, con 6300 puntos en esa línea; en un móvil, cuatro o cinco veces más, cada segundo y durante horas de ronda. Ahora se parte en trozos de 800 m: los recorridos se quedan quietos y en cada posición solo se rehace el último. Medido después: **3,5 ms en el km 1 y 3,5 ms en el km 100**, la línea más larga en 145 puntos, y lo verde sumando exactamente los 100 000 m recorridos, sin huecos ni solapes en las uniones. La línea azul de lo siguiente sigue pintándose por encima.

**La última ruta cabe en el móvil.** Se guardaba como JSON punto a punto y además **dos veces**: los puntos seguidos en `pts` y los mismos otra vez partidos por tramos del GPX en `parts`. La ronda de 108 km ocupaba 2,88 millones de caracteres -5,8 MB tal como cuenta el navegador, dos bytes por carácter- y el almacén de un iPhone ronda los 5 MB: no se podía guardar, y al volver a abrir la aplicación había que cargar el GPX otra vez. Ahora las coordenadas se guardan como diferencias enteras, y de los tramos solo cuánto mide cada uno, porque el lector de GPX los arma siempre con los mismos puntos seguidos. Queda en 143 000 caracteres, **20 veces menos**. Sin perder nada de lo que importa: las coordenadas a siete decimales exactos, que son los que usa la huella de la ruta -con menos, la huella cambiaría al recuperarla y se perderían el avance guardado, el registro de tramos y los avisos revisados-, las horas al milisegundo, de las que salen paradas y ritmo, y la altitud si la hay. Comprobado con la ronda larga: misma huella antes y después, y «Continuar desde 100,17 km» seguía ahí. Lo guardado con el formato anterior se sigue leyendo y se convierte al volver a guardarse. El almacén entero pasa de 9,7 a 4,3 MB.

**Y los datos de calles, también.** Después de la ruta, lo que más ocupaba era la última comprobación de sentidos: se guardaba la respuesta entera de OpenStreetMap, y con la ronda de 108 km eran 1497 vías y 1,86 millones de caracteres, 3,6 MB en el móvil. Pero el comprobador solo mira las vías a menos de 16 m del recorrido. Ahora se guardan solo las que pasan a menos de 40 m -margen de sobra: se comprueba con muestras cada 5 m- y con la misma codificación que la ruta, sin el recuadro que Overpass añade a cada vía y que nadie usa: **757 vías y 187 000 caracteres, 10 veces menos**. Comprobado con la ronda real y tres perfiles de vehículo: los avisos, los 292 tramos de nombre de calle y los 266 giros salen exactamente iguales que con la respuesta entera, y en las pruebas lo mismo con cientos de calles al azar alrededor de una ruta, a propósito con contramanos, dudas y límites de altura y peso. Como lo guardado solo sirve para esa ruta, va con su huella, y lo guardado con el formato anterior se reescribe compacto al abrir la aplicación, con la fecha de la consulta original, así que no se le alarga la vida. Si aun así el almacén se llenara, se sacrifican antes las otras consultas guardadas, que se pueden repetir, que la ruta o el avance. Y el trazado ajustado a las calles, que se guarda aparte -hasta tres-, va con la misma codificación que la ruta: de 233 000 a 40 000 caracteres, con la misma huella al recuperarlo. **El almacén entero de la ronda larga queda en 0,7 MB**, de los 9,7 del principio.

## Acabado

Cada función trajo su hoja de estilos, y sobre el mapa se fueron pisando: una estiraba la barra de vistas a todo el ancho y otra empujaba sus botones a la derecha, con medio hueco vacío; los mandos de la cabina se dibujaban con caracteres sueltos -«◖))» para la voz, «◎» para centrar, «↻» para repetir-; el simulador y la vista de calle usaban emojis de colores; y a pantalla completa, sin conducir, el zoom y «Reducir mapa» quedaban debajo de la hora del iPhone. `acabado.css` va la última y pone orden en todo lo que flota sobre el mapa:

- **Un solo material**: vidrio esmerilado -fondo translúcido con desenfoque, un filo fino y una sombra suave- para el zoom, la barra de vistas, ampliar y reducir, la leyenda y los mandos de la cabina. Con el ahorro de batería activo se quita el desenfoque, que es lo que más gasta.
- **Iconos de línea**, del mismo trazo que los de las pestañas, en vez de caracteres y emojis: brújula y flecha de rumbo, altavoz y altavoz tachado, punto de mira, repetir, ampliar y reducir, persona para Street View, cámara para las fotos de la calle, velocímetro para lento y rápido. Los textos se quedan para el lector de pantalla.
- **La barra de vistas, del tamaño de lo que lleva**, a la derecha: 2D, Satélite y 3D como un selector, y tras una raya Street View y las fotos de la calle como iconos, porque son acciones y no vistas.
- **La leyenda con una muestra de cada color** -Calles, Ruta, Hecho, Próximo- en vez de «Dorado: calles · gris: GPX · verde: hecho · azul: siguiente», que no cabía y se cortaba. La explicación entera va en la etiqueta para el lector de pantalla.
- **A pantalla completa, todo dentro de las zonas seguras del iPhone**: el zoom y reducir por debajo de la hora, la leyenda, la escala y la atribución por encima de la barra de inicio y de la del simulador.
- **La cabina, de noche también**: en modo oscuro la tarjeta de la calle, los botones y el panel de abajo eran blancos y deslumbraban; ahora son de vidrio oscuro, con los colores de cada tipo de vía en su versión oscura.
- **Detalles**: el botón de salir, un círculo de vidrio dentro del cartel en vez de una mancha roja montada sobre la franja de «Simulación»; «Repetir indicación» solo con la navegación en marcha; la escala solo a pantalla completa; las rayas entre llegada, tiempo, restante y ritmo, bien puestas con cuatro datos; y los colores de «Ritmo», que eran para fondo oscuro, legibles sobre el panel blanco.

- **La flecha de la maniobra, dibujada y no escrita.** El cartel mostraba un carácter -↰, ↱, ⟲- y cada tipo de letra lo dibuja a su manera: fino, desigual, a veces con otra altura. Ahora son iconos de trazo grueso, como los de un navegador de coche: recto, izquierda, derecha, cambio de sentido, salida, llegada -una bandera-, aviso y buscando posición. La rotonda es el pictograma de la señal: tres flechas en círculo en sentido contrario a las agujas del reloj; un anillo con una flecha en diagonal, que se probó antes, se parecía demasiado a ♂. Qué icono toca a cada símbolo lo decide `hud-core.js` (`maneuverIcon`), y una prueba recorre todas las maniobras que pueden dar Valhalla, el GPX y el propio cartel para que ninguna se quede sin dibujo. Un símbolo desconocido se sigue viendo como carácter.
- **Interruptores**: las opciones de sí o no -avisos por voz, modo simulación, arrancar la navegación- eran casillas sueltas; ahora son interruptores.
- **La hoja de «Ruta y ajustes» por encima de todo**: la barra del simulador quedaba encima tapándole botones.

- **Señales de la vía, dibujadas como las de verdad.** Los avisos de contramano y de restricción eran emojis -⛔, ⚠- que cada móvil pinta a su manera y a otra escala que el resto. En el mapa, en la vista 3D y en el aviso de la cabina ahora son señales: disco rojo con barra blanca para contramano o prohibido, triángulo blanco con borde rojo para los avisos. Las ya revisadas siguen saliendo apagadas. En las listas y ventanas de texto el símbolo se queda, que allí ayuda a ojear.
- **Abrir y cerrar con un chevrón dibujado.** Eran tres caracteres distintos -«⌃» en el simulador, «+» y «−» en los desplegables, «⌄» en las secciones- que se leían como letras.
- **Una sola letra.** El diseño original escribía datos y etiquetas -«283 puntos», «RECORRIDO», coordenadas- en letra de máquina, y junto a la del resto parecían de otra aplicación. Ahora usan la misma, con cifras de ancho fijo para que las columnas sigan alineadas. Los campos donde se pegan enlaces se quedan con la suya.
- **El plano de la pestaña del conductor**: la escala iba abajo a la izquierda, justo donde empezaba el recorrido, y la «A» la tapaba. Ahora el dibujo deja una franja para ella, y las marcas A y B son más grandes.
- **Con el móvil en horizontal**: el botón de salir va sobre el mapa y no sobre el cartel oscuro, así que es de vidrio oscuro; simulando, toda la pantalla baja lo que mide la franja roja, que tapaba la tarjeta de la calle y el cartel; y los botones de lento y rápido pierden el icono, que no cabía.

- **Al pulsar, una respuesta leve**: los botones, chips, pestañas y mandos del simulador se hunden un poco, como un botón de verdad; antes solo bajaban un píxel los botones grandes. Con «reducir movimiento» activado en el móvil, no.

- **El coche se desliza en vez de saltar.** Con una posición del GPS por segundo, el coche y el mapa se colocaban de golpe en cada una: un tirón cada segundo. Ahora, entre una posición y la siguiente, el coche avanza a pasitos -medido con el simulador a 50 km/h: 165 movimientos en 3 segundos, de 0,3 m como mucho, en vez de un salto de 14 m por segundo- y el mapa le acompaña con un desplazamiento suave de la misma duración. Es solo lo que se ve: el avance, las indicaciones y todo lo demás usan la posición real en cuanto llega, y la posición que se da a los demás módulos -marcas, fotos de la calle, 3D, accesos- también es la real, no la dibujada. Sin animación con el ahorro de batería, con «reducir movimiento», ante saltos de más de 250 m -el GPS que vuelve tras perderse- y con la aplicación oculta, donde el navegador no anima y el coche se habría quedado atrás.

Comprobado con el auditor de pantalla en la vista previa, a pantalla completa y conduciendo: nada importante tapado. El propio auditor daba cuatro falsas alarmas a pantalla completa con el simulador -las pestañas, que quedan debajo del mapa, salían "tapadas por el simulador"-; ahora mira toda la pila de capas en ese punto y no solo la de arriba.

## Menús sobre el mapa

Mientras se conduce hay cuatro cosas apiladas sobre el mapa y ninguna puede taparse con otra: el cartel de maniobra, la tarjeta de la calle, el aviso de vía y la barra de vistas. Iban colocadas con distancias fijas, y la barra creció -2D, Satélite, 3D, Lugares, Street View, Calle- hasta ocupar todo el ancho en un móvil, justo donde vive la tarjeta.

Medido a 375×667 antes de tocarlo: tarjeta de 12 a 230, barra de 12 a 363, y la tarjeta tapaba **2D, Satélite y 3D**. El aviso de vía era peor: iba a 66 px del cartel, o sea dentro de la tarjeta, y con z-index 510 contra 615 y 530 quedaba **detrás de las dos**. Una advertencia de sentido contrario escondida tras un menú.

Ahora se apilan de verdad. La altura del cartel ya la medía un `ResizeObserver`; ahora también se miden la tarjeta y el aviso, y cada uno empuja al siguiente. El orden es el de la urgencia: primero qué maniobra viene, luego por dónde vas, luego la advertencia si la hay, y al final la barra, que es lo único que no corre prisa. Cuando algo no está, no deja hueco.

En horizontal la maquetación es otra -las indicaciones van en una columna a la derecha y los mandos del mapa a la izquierda- y allí la barra tenía un `top` fijo de 68 px con la tarjeta acabando en 70. Ahora es `max(68px, 12px + alto de la tarjeta)`: mantiene los 68 de siempre cuando no hay tarjeta, y baja cuando la hay.

**La instrucción ya no se corta.** «En la rotonda, toma la salida 1» pedía 254 px en una caja de 231 y se quedaba en «…toma la sal…». Perder el número de salida es perder la instrucción entera. Ahora usa hasta dos líneas y de ahí no pasa; el cartel crece y lo de debajo baja solo.

Comprobado en 360×640, 375×667, 390×844, 412×915, 430×932 y en horizontal 667×375 y 844×390, con la instrucción más larga que genera la aplicación y con y sin aviso de vía: nada fuera de la pantalla, ningún solape, y cada botón de la barra recibiendo su propio clic.

**Y no dependen de que un observador llegue a tiempo.** Las tres medidas se tomaban solo con `ResizeObserver`, cuya entrega va atada al ciclo de pintado: en una pestaña que el navegador no está dibujando no llega, las variables se quedan sin poner, el CSS cae a los valores por defecto y la tarjeta se planta encima de la barra. Medido así en el sitio publicado: 242×23 px de solape, encontrado por el propio auditor. Ahora se remiden también en cada actualización de posición, que es cuando de verdad importa que esté bien. Lo que se guarda no es cuánto mide el cartel sino **dónde acaba**: en simulación arranca 24 px más abajo para no quedar bajo la franja roja, y con la altura a secas la tarjeta se le metía debajo.

La instrucción de maniobra llevaba `line-height:1.12`, demasiado justo para dos líneas: la caja daba 41 px y el texto pedía 44, así que «En la rotonda, toma la salida 1» se cortaba por abajo. Con 1,2 cabe entera.

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

Cuando hay una versión preparada y se está navegando, aparece «Nueva versión · actualizar» y se aplica al pulsarlo con la navegación detenida; fuera de la navegación entra sola, sin que nadie tenga que saber qué es eso. La limpieza de versiones anteriores conserva las cachés de otras aplicaciones del mismo dominio.

## Mapa 3D de calles

El selector 2D / 3D activa un segundo renderizador con MapLibre GL JS 4.7.1 (licencia BSD incluida) y el estilo Liberty de OpenFreeMap. Ofrece calles rotuladas, edificios con volumen donde existen datos y una cámara a 55 grados. La primera activación carga el motor y las teselas de OpenFreeMap se solicitan solo al abrir esta vista. Se guardan igual que las del 2D, en el mismo almacén y con el mismo tope de 1500: una zona vista con cobertura vuelve a estar disponible sin ella, y las dos vistas compiten por ese tope, así que explorar mucho en 3D puede desalojar teselas del 2D. La traza GPX no se envía al proveedor: solo se piden las teselas del área visible.

El seguimiento, los giros y las restricciones siguen dependiendo del mismo GPX y del mismo motor de navegación. Ambas vistas comparten posición, avance y avisos revisados; cambiar de vista no recalcula la ruta. Al iniciar navegación desde 3D se activa la orientación a la marcha; el botón de orientación permite volver al norte. Arrastrar suspende el seguimiento y Centrar GPS lo recupera. Una falta de soporte gráfico, pérdida del contexto WebGL o carga inicial agotada devuelve al mapa 2D.

Fuentes de integración: https://openfreemap.org/quick_start/ y https://maplibre.org/maplibre-gl-js/docs/examples/display-buildings-in-3d/ . El volumen de los edificios es cartográfico; Satélite es una capa independiente de imágenes de Esri.

Validación: carga real de calles y edificios, GPS simulado con rumbo, pausa y recuperación de cámara, cambio 2D/3D durante navegación, avisos sobre el mapa y limpieza al cambiar de ruta. Verificado también el retorno a 2D sin WebGL y las 94 pruebas del motor existente. Pendiente la comprobación de rendimiento con GPS real en el teléfono.

## Google Street View

El control **Street View** activa la selección sobre el mapa: después de pulsarlo se puede tocar **cualquier punto del mapa**, sin iniciar la navegación y aunque no haya ruta cargada. Antes solo servía la línea GPX: cualquier toque se llevaba al punto de la ruta más cercano, aunque estuviera a un kilómetro, y no había forma de mirar una calle de al lado. Ahora se abre donde se toca, sin rumbo -Google elige hacia dónde mirar-. Si el toque cae encima de la línea -a menos de 28 píxeles de pantalla, lo que cubre un dedo, así que vale a cualquier zoom-, se ajusta a ella y la cámara mira en el sentido del recorrido, que es lo útil para preparar la ronda. El modal dice cuál de los dos es: «Punto de la ruta» o «Punto del mapa». Para elegir, el mapa se pone en 2D y con el norte arriba: en 3D o girado según la marcha, el toque no cae donde se ve. El modal se puede cerrar para volver exactamente al mismo punto del mapa y conserva un enlace para abrir Google Maps aparte si el visor incrustado no carga. Al cerrarlo el iframe se suelta -se le pone `about:blank`-: si no, la página de Google seguía cargada de fondo gastando red y batería. El evento `close` del `<dialog>` no llega a dispararse aquí -medido-, así que la limpieza se hace también a mano desde el botón de cerrar y desde `cancel`, que sí llega con Escape.

El mismo visor es el último eslabón de la vista de calle del simulador: donde KartaView y Panoramax no tienen nada, aparece **Verla en Google Street View** y se abre en la posición actual. A Google solo le llegan esa coordenada y el rumbo.

Solo se comparte con Google la coordenada elegida y, si es de la ruta, el rumbo. El archivo GPX, sus horas, la biblioteca de rutas y las medidas del vehículo permanecen en el dispositivo. La panorámica depende de la cobertura de Street View; si Google no tiene imágenes en ese punto puede mostrar únicamente el mapa.

## Llegar al comienzo

Al iniciar, la primera posición GPS reciente con precisión de 60 metros o mejor se compara con el punto seleccionado del GPX. Si queda a más de 100 metros en línea recta, se detiene el seguimiento sin avanzar por la traza y se ofrece calcular un acceso interno por calles. El botón Llegar al inicio permite abrir este acceso antes de activar el GPS. Si se ha elegido una pasada posterior, ese punto es el destino.

El acceso se calcula con OSRM/FOSSGIS y aparece dentro del mismo navegador de Rutas. Solo se envían las coordenadas necesarias para calcular ese tramo; el GPX completo permanece en el dispositivo. Al llegar al punto elegido, Rutas enlaza con el recorrido original sin perder su orden.

Comprobado en navegador con GPS simulado: lejos no avanza el GPX, cerca comienza el seguimiento, baja precisión mantiene la espera, cambiar la pasada actualiza el destino y Escape cierra el diálogo. Las 39 pruebas existentes siguen pasando.

### Volver del acceso

Al calcular el acceso se guarda localmente la huella de la ruta y el punto seleccionado, durante un máximo de 24 horas. La tarjeta «Tu ruta te espera» sobrevive a una recarga. «Ya he llegado · comprobar GPS» recupera ese punto y solicita una posición fiable antes de comenzar; no inicia nada automáticamente al volver a la app. El recordatorio se borra al comenzar cerca del destino, al descartarlo, al cambiar a otra ruta o al caducar.

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

Este acceso no considera altura, peso ni anchura del vehículo. El GPX guardado y su progreso no se sustituyen por el trayecto calculado. Si el servicio de cálculo no responde, la ruta permanece intacta y se puede reintentar.
