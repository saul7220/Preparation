# Marswalk 3D — Exploración EVA e Inteligencia Topográfica en Marte

Aplicación 3D interactiva en navegador (ES Modules + Three.js, sin empaquetador) para exploración orbital y en primera persona de modelos digitales de elevación (DEM) marcianos, con telemetría fisiológica EVA (`PLSS`), sistema de capas científicas (*Layered View*), puntos de interés (`POIs`) y planificación de rutas seguras mediante **A\* (Clásico)** y **QAOA (Cuántico-inspirado)**.

---

## 1. Inicio rápido (Servidor estático local)

Ejecuta un servidor HTTP estático desde la raíz del proyecto (`Prototype/`):

```bash
python3 -m http.server 8000
```

Abre en el navegador:
- **Cráter Jezero (CTX 20 m/px):** `http://localhost:8000/?dataset=jezero_test`
- **Cráter Sintético (Validación 50 m/px):** `http://localhost:8000/?dataset=synth_crater`

*(También puedes cambiar de dataset directamente desde el selector desplegable del panel superior izquierdo).*

---

## 2. Pipeline de datos (Conversión de un nuevo DEM en un comando)

Para convertir cualquier GeoTIFF de elevación marciana (Float32) al contrato estándar `data/<dataset_id>/` (`metadata.json`, `heightmap.f32`, `texture.png`, `config_fisio.json`), ejecuta:

```bash
python3 data_pipeline/convert_dem.py \
  --dem "Semana 1/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif" \
  --texture "Semana 1/jezero_heightmap.png" \
  --dataset-id jezero_test
```

> El script utiliza únicamente la biblioteca estándar de Python (`struct`, `zlib`, `json`, `math`), sin depender de GDAL/rasterio.

### Validación automática de contratos (Sección 4)

Verifica que todos los datasets en `data/` cumplan los contratos `4.1` (`metadata.json` + `.f32`), `4.2` (`config_fisio.json`), `4.3` (`route.json`) y `4.4` (`poi.json`):

```bash
python3 data_pipeline/validate_contracts.py
```

---

## 3. Controles y funcionalidades principales

### Vista Orbital
- **Rotar / Zoom / Paneo:** Clic izquierdo + arrastrar / Rueda del ratón / Clic derecho + arrastrar.
- **Inspección científica y POIs:** Haz clic sobre cualquier punto del terreno o sobre un marcador 3D de POI para abrir el popup con elevación real (m), pendiente real (°), distancia al astronauta y cita científica.
- **Reubicar astronauta:** Arrastra el marcador del astronauta sobre el terreno o usa el botón **«Mover astronauta aquí»** en el popup.
- **Capas de visualización (*Layered View*):** Activa/desactiva y regula la opacidad de `Textura Base`, `Pendiente (°)`, `Riesgo Terreno` y `POIs Ciencia`.
- **Planificador de Ruta (A\* / QAOA):**
  - Alterna entre **`A* (Clásico)`**, **`QAOA (Cuántico)`** o **`A* vs QAOA`** (comparación simultánea en el terreno).
  - Usa **«📍 Elegir Inicio / Destino»** (o los botones **«🚩 Fijar Inicio (A)»** / **«🏁 Fijar Destino (B)»** del popup) para trazar la ruta óptima proyectada sobre el relieve con flechas direccionales y exportar `route.json`.

### Vista en Primera Persona (Visor EVA · PLSS)
- **Entrar:** Doble clic sobre el marcador del astronauta (o botón **«Entrar en 1ª persona»** del popup).
- **Movimiento:** `W` `A` `S` `D` o flechas para caminar ($1.2\text{ m/s}$), `Shift` para correr ($2.5\text{ m/s}$), `Espacio` para saltar ($g = 3.71\text{ m/s}^2$), `Esc` para volver a la vista orbital.
- **HUD EVA en tiempo real:** Reserva y flujo metabólico de $\text{O}_2$ según pendiente e inclinación de marcha, alerta de pendiente crítica ($> 25^\circ$), pulso cardíaco, brújula y mini-radar topográfico de $2 \times 2\text{ km}$ con ruta y POIs cercanos.


## Primer paso — introducción EVA

La entrada principal incluye una secuencia 3D original de 26 segundos: visor, revisión de muñeca, apertura de esclusa, contacto de la bota, plano exterior y entrada al visor EVA. Es animación en tiempo real, sin descarga de video ni modelos externos. El traje articulado y la escenografía son procedurales; el relieve se muestrea del DEM cargado. Los detalles de polvo, rocas y esclusa son representación artística de una simulación.

- `?dataset=jezero_test&intro=1`: reproduce el prólogo completo.
- `?dataset=synth_crater&intro=1`: misma introducción sobre el dataset sintético.
- `?nointro=1`: acceso directo al mapa.
- Tras verlo o saltarlo, las siguientes visitas de la sesión muestran la entrada breve. «Intro» y «Volver a ver» repiten la secuencia.
- «Activar sonido» habilita ambiente sintetizado y voz española del navegador cuando está disponible; los subtítulos siempre están presentes.
- Espacio pausa o continúa; Escape y «Saltar intro» vuelven al mapa. «Iniciar EVA» solicita el control del ratón mediante un clic explícito.
- La preferencia del sistema de reducir movimiento abre directamente la pantalla de entrada. El escenario no consume O2 durante el prólogo.
- Se mantienen los controles de escritorio de Marswalk; la introducción se adapta a pantallas estrechas, pero esto no añade locomoción táctil al simulador.

La implementación principal está en la raíz. La carpeta `Semana 1/` conserva la versión histórica de la aplicación.

### Verificación de esta versión (2026-11-04)

Se verificaron la secuencia completa con Jezero, la pausa/continuación, la pantalla final y la repetición desde el mapa en el navegador integrado de Codex. La escena no produjo errores de WebGL en esas comprobaciones. Los siete módulos JavaScript afectados pasan `node --check` y el diff pasa `git diff --check`.

El navegador integrado rechazó Pointer Lock al pulsar «Iniciar EVA»; se verificó el retorno al mapa con un aviso para reintentar. La navegación EVA con ratón requiere validación en un navegador de escritorio que permita esa API. No se han medido FPS ni validado todavía el dataset sintético, dispositivos móviles, lectores de pantalla o todas las voces del sistema. Esta versión usa un astronauta estilizado procedural; no incluye un modelo humano fotorrealista ni un video prerenderizado.
