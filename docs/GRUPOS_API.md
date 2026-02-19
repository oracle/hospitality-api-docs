# GRUPOS (BLOCKS) - Especificación API Opera Cloud

## Objetivo
Capturar las habitaciones de grupos/blocks que **aún no tienen rooming** (pickup pendiente), evitando duplicar las que ya están en la tabla de RESERVAS.

---

## Concepto Clave: Block vs Reserva

```
BLOCK "CONGRESO2026" (100 habitaciones contratadas)
│
├── 10 con rooming → Ya están en RESERVAS (con blockCode="CONGRESO2026")
│                    ↳ NO incluir en tabla GRUPOS
│
└── 90 sin rooming → Pendientes de asignar huésped
                     ↳ INCLUIR en tabla GRUPOS (como "reservas virtuales")
```

Opera Cloud gestiona esto así:
- **`allocated`** = Total de habitaciones contratadas en el block
- **`pickup`** = Habitaciones que ya tienen reserva individual (rooming)
- **`available`** = Habitaciones pendientes de asignar (`allocated - pickup`)

---

## Endpoints Principales

### 1. Listar Blocks
```
GET /blk/v1/blocks
```
Obtiene la lista de blocks con información básica.

### 2. Estadísticas Diarias del Block
```
GET /blk/v1/blocks/dailyStatistics
```
Obtiene estadísticas por día y tipo de habitación para todos los blocks.

### 3. Estadísticas Detalladas de un Block
```
GET /blk/v1/blocks/{blockId}/statistics
```
Obtiene estadísticas detalladas de un block específico con tarifas e ingresos.

---

## Endpoint 1: Listar Blocks (getBlocks)

### Request
```bash
GET /blk/v1/blocks?hotelId=4821&blockStartStartDate=2026-01-01&blockEndEndDate=2026-12-31&limit=200

# Headers
x-hotelid: 4821
x-app-key: {{appKey}}
Authorization: Bearer {{token}}
```

### Parámetros de Filtro Importantes
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `hotelId` | string | ID del hotel |
| `blockStartStartDate` | date | Fecha inicio del rango de búsqueda |
| `blockEndEndDate` | date | Fecha fin del rango de búsqueda |
| `blockStatus` | array | Filtrar por estado del block |
| `marketCode` | array | Filtrar por segmento de mercado |
| `sourceCode` | array | Filtrar por fuente |
| `limit` | integer | Máximo 200 registros |
| `offset` | integer | Para paginación |

### Response (extracto)
```json
{
  "blockSummaries": {
    "blockInfo": [
      {
        "blockIdList": [
          { "id": "123456", "type": "Block" }
        ],
        "block": {
          "hotelId": "4821",
          "blockCode": "CONGRESO2026",
          "blockName": "Congreso Nacional de Medicina",
          "blockStatus": {
            "code": "DEF",
            "description": "Definite"
          },
          "rateCode": "GRP_BB",
          "startDate": "2026-03-15",
          "endDate": "2026-03-18",
          "cutoffDate": "2026-03-01",
          "rooms": 100,
          "actualRooms": 10,
          "groupName": "Asociación Médica Nacional",
          "reservationType": "GROUP",
          "createDateTime": "2025-11-20T10:30:00",
          "lastModifyDateTime": "2026-01-28T14:15:00"
        }
      }
    ],
    "totalResults": 45,
    "hasMore": false
  }
}
```

### Campos del Block Summary
| Campo | Descripción |
|-------|-------------|
| `blockCode` | Código único del block |
| `blockName` | Nombre del grupo/evento |
| `blockStatus` | Estado: DEF (Definite), TEN (Tentative), CAN (Cancelled), etc. |
| `rateCode` | Código de tarifa negociada |
| `startDate` / `endDate` | Fechas de estancia del grupo |
| `cutoffDate` | Fecha límite para rooming |
| `rooms` | **Total de habitaciones contratadas** |
| `actualRooms` | **Habitaciones con rooming (pickup)** |
| `groupName` | Nombre del perfil de grupo |
| `createDateTime` / `lastModifyDateTime` | Fechas de auditoría |

---

## Endpoint 2: Estadísticas Diarias (getBlockDailyStatistics)

### Request
```bash
GET /blk/v1/blocks/dailyStatistics?hotelId=4821&start=2026-01-01&end=2026-03-31&limit=31

# Headers
x-hotelid: 4821
x-app-key: {{appKey}}
Authorization: Bearer {{token}}
```

### Parámetros
| Parámetro | Descripción | Límite |
|-----------|-------------|--------|
| `hotelId` | ID del hotel | |
| `start` | Fecha inicio | |
| `end` | Fecha fin | Máximo 90 días |
| `limit` | Máximo registros | 31 |

### Response
```json
{
  "blockDailyStatistics": [
    {
      "blockIdList": [{ "id": "123456", "type": "Block" }],
      "blockCode": "CONGRESO2026",
      "blockName": "Congreso Nacional de Medicina",
      "hotelId": "4821",
      "timeSpan": {
        "startDate": "2026-03-15",
        "endDate": "2026-03-18"
      },
      "stayDates": [
        [
          {
            "roomTypeStatisticsList": [
              {
                "roomType": "DBL",
                "statisticsInfo": {
                  "allocated": 50,
                  "pickup": 5,
                  "available": 45
                }
              },
              {
                "roomType": "JSUI",
                "statisticsInfo": {
                  "allocated": 30,
                  "pickup": 3,
                  "available": 27
                }
              }
            ],
            "date": "2026-03-15"
          }
        ],
        [
          {
            "roomTypeStatisticsList": [
              {
                "roomType": "DBL",
                "statisticsInfo": {
                  "allocated": 50,
                  "pickup": 5,
                  "available": 45
                }
              },
              {
                "roomType": "JSUI",
                "statisticsInfo": {
                  "allocated": 30,
                  "pickup": 3,
                  "available": 27
                }
              }
            ],
            "date": "2026-03-16"
          }
        ]
      ]
    }
  ]
}
```

### Campos de Estadísticas por Día y Tipo
| Campo | Descripción |
|-------|-------------|
| `allocated` | **Total contratado** para ese día/tipo |
| `pickup` | **Con rooming** (ya en reservas) |
| `available` | **Pendiente de rooming** (`allocated - pickup`) |

---

## Endpoint 3: Estadísticas Detalladas con Tarifas (getBlockStatistics)

### Request
```bash
GET /blk/v1/blocks/123456/statistics?hotelId=4821&startDate=2026-03-15&numberOfDays=4&statisticsInstructions=Contract&statisticsInstructions=Pickup&statisticsInstructions=Available&statisticsInstructions=Rates&statisticsInstructions=Roomrevenue

# Headers
x-hotelid: 4821
x-app-key: {{appKey}}
Authorization: Bearer {{token}}
```

### statisticsInstructions Disponibles
| Instruction | Descripción |
|-------------|-------------|
| `Contract` | Habitaciones contratadas |
| `Initial` | Inventario inicial |
| `Actual` | Inventario actual |
| `Pickup` | Habitaciones con rooming |
| `Available` | Habitaciones disponibles |
| `Change` | Cambios |
| `Rates` | **Tarifas por tipo de habitación** |
| `Totalavailable` | Total disponible |
| `Tentativereservations` | Reservas tentativas |
| `Pickuppersons` | Personas con pickup |
| `Roomrevenue` | **Ingresos de habitación** |
| `Totalrevenue` | Ingresos totales |
| `Avgroomrate` | Tarifa media |

---

## Mapeo a tu Base de Datos

### Tabla: `grupos`

El objetivo es que esta tabla contenga las habitaciones **pendientes de rooming**, con una estructura similar a `reservas`.

| Campo BD | Campo API | Ubicación | Notas |
|----------|-----------|-----------|-------|
| `idhotel` | hotelId | `block.hotelId` | |
| `idgrupo` | blockId | `blockIdList[type=Block].id` | ID único del block |
| `idgrupo_codigo` | blockCode | `block.blockCode` | Código del block |
| `nombre_grupo` | blockName | `block.blockName` | |
| `fecha_pernoctacion` | date | `stayDates[].date` | Una por cada noche |
| `tipo_habitacion` | roomType | `roomTypeStatisticsList[].roomType` | |
| `habitaciones_contratadas` | allocated | `statisticsInfo.allocated` | Total contratado |
| `habitaciones_pickup` | pickup | `statisticsInfo.pickup` | Ya en reservas |
| `habitaciones_pendientes` | available | `statisticsInfo.available` | **Estas guardamos** |
| `tarifa` | rateCode | `block.rateCode` | |
| `estado_grupo` | blockStatus.code | `block.blockStatus.code` | DEF, TEN, CAN... |
| `fecha_corte` | cutoffDate | `block.cutoffDate` | |
| `fecha_inicio` | startDate | `block.startDate` | |
| `fecha_fin` | endDate | `block.endDate` | |
| `fecha_creacion` | createDateTime | `block.createDateTime` | |
| `fecha_actualizacion` | lastModifyDateTime | `block.lastModifyDateTime` | |

### Clave Única
```
id_unico = CONCAT(idHotel, '-', blockCode, '-', fecha_pernoctacion, '-', tipo_habitacion)
Ejemplo: "4821-CONGRESO2026-2026-03-15-DBL"
```

---

## Lógica: Evitar Duplicados con Reservas

### Concepto
```
RESERVAS (tabla)        GRUPOS (tabla)
─────────────────      ─────────────────
pickup (10 hab)    +   available (90 hab)   =   allocated (100 hab total)
```

**Las reservas con `blockCode` ya tienen su registro en la tabla RESERVAS.**
**La tabla GRUPOS solo almacena las habitaciones `available` (pendientes de rooming).**

### En cada Carga/Actualización
```python
def procesar_grupos(hotel_id, fecha_inicio, fecha_fin):
    # 1. Obtener estadísticas diarias de todos los blocks
    stats = get_block_daily_statistics(hotel_id, fecha_inicio, fecha_fin)

    registros = []
    for block in stats['blockDailyStatistics']:
        block_code = block['blockCode']
        block_name = block['blockName']

        for stay_date_list in block['stayDates']:
            for day_stats in stay_date_list:
                fecha = day_stats['date']

                for room_stats in day_stats.get('roomTypeStatisticsList', []):
                    room_type = room_stats['roomType']
                    info = room_stats['statisticsInfo']

                    # SOLO guardamos las habitaciones PENDIENTES (available)
                    habitaciones_pendientes = info.get('available', 0)

                    if habitaciones_pendientes > 0:
                        registro = {
                            'id_unico': f"{hotel_id}-{block_code}-{fecha}-{room_type}",
                            'idhotel': hotel_id,
                            'idgrupo_codigo': block_code,
                            'nombre_grupo': block_name,
                            'fecha_pernoctacion': fecha,
                            'tipo_habitacion': room_type,
                            'habitaciones_contratadas': info.get('allocated', 0),
                            'habitaciones_pickup': info.get('pickup', 0),
                            'habitaciones_pendientes': habitaciones_pendientes,
                            'fecha_actualizacion': datetime.now()
                        }
                        registros.append(registro)

    return registros
```

---

## Proceso de Carga

### Carga Inicial
```
1. Obtener lista de blocks activos (getBlocks)
2. Para cada block, obtener estadísticas diarias (getBlockDailyStatistics)
3. Para cada día/tipo con available > 0:
   - Crear registro en tabla GRUPOS
```

### Proceso Incremental Diario
```
1. Obtener blocks con lastModifyDateTime = ayer
2. Para cada block modificado:
   - Obtener estadísticas diarias actualizadas
   - Para cada día/tipo:
     - Si available > 0 → UPSERT en GRUPOS
     - Si available = 0 → DELETE de GRUPOS (ya tiene rooming completo)
3. La fecha_actualizacion permite detectar registros obsoletos
```

### Detección de Grupos Cancelados o Completados
```sql
-- Grupos que ya no tienen habitaciones pendientes
-- (todas con rooming o cancelados)
DELETE FROM grupos
WHERE idgrupo_codigo NOT IN (
    SELECT DISTINCT blockCode
    FROM api_response_blocks
    WHERE available > 0
)
AND fecha_actualizacion < DATE('yesterday');
```

---

## Enriquecimiento con Datos del Block

Para obtener más campos similares a reservas (marketCode, sourceCode, etc.), necesitas consultar el detalle del block.

### Opción: Obtener Block Completo
```bash
GET /blk/v1/blocks/{blockId}?hotelId=4821&fetchInstructions=Header&fetchInstructions=RoomTypes

# Response incluye:
{
  "blockDetails": {
    "marketCode": { "code": "CORP", "description": "Corporate" },
    "sourceCode": { "code": "DIRECT", "description": "Direct Sales" },
    "reservationMethod": "EMAIL",
    "blockProfiles": [
      { "profileType": "Group", "profileName": "Asociación Médica", "profileId": "789" },
      { "profileType": "Company", "profileName": "Empresa XYZ", "profileId": "456" }
    ]
  }
}
```

---

## Cómo Calcular Importes para GRUPOS

El block tiene tarifa negociada (`rateCode`), pero el importe por habitación pendiente se puede estimar así:

### Opción A: Usar getBlockStatistics con Rates
```bash
GET /blk/v1/blocks/{blockId}/statistics?statisticsInstructions=Rates&statisticsInstructions=Available
```

### Opción B: Consultar la tarifa del rate plan
```bash
GET /rtp/v1/hotels/{hotelId}/ratePlans/{rateCode}
```

### Cálculo
```python
# Si tienes la tarifa por tipo de habitación
importe_pendiente = tarifa_por_noche * habitaciones_pendientes

# Ejemplo: 45 habitaciones DBL pendientes × 120€ = 5,400€/noche
```

---

## Estados del Block (blockStatus)

| Código | Descripción | Incluir en GRUPOS |
|--------|-------------|-------------------|
| `TEN` | Tentative (tentativo) | Sí (con flag tentativo) |
| `DEF` | Definite (confirmado) | Sí |
| `ACT` | Actual (activo) | Sí |
| `CAN` | Cancelled | No (o marcar como cancelado) |
| `LOS` | Lost | No |
| `INQ` | Inquiry | Opcional |

---

## Limitaciones de la API

| Limitación | Valor |
|------------|-------|
| Máximo blocks por llamada (getBlocks) | **200** |
| Máximo días por llamada (dailyStatistics) | **90 días** |
| Máximo registros dailyStatistics | **31** |

---

## Ejemplo Completo con cURL

### 1. Listar blocks activos
```bash
curl -X GET \
  'https://{{host}}/blk/v1/blocks?hotelId=4821&blockStartStartDate=2026-01-01&blockEndEndDate=2026-06-30&blockStatus=DEF&blockStatus=TEN&limit=200' \
  -H 'x-hotelid: 4821' \
  -H 'x-app-key: {{appKey}}' \
  -H 'Authorization: Bearer {{token}}'
```

### 2. Obtener estadísticas diarias
```bash
curl -X GET \
  'https://{{host}}/blk/v1/blocks/dailyStatistics?hotelId=4821&start=2026-01-01&end=2026-03-31&limit=31' \
  -H 'x-hotelid: 4821' \
  -H 'x-app-key: {{appKey}}' \
  -H 'Authorization: Bearer {{token}}'
```

### 3. Estadísticas detalladas con tarifas
```bash
curl -X GET \
  'https://{{host}}/blk/v1/blocks/123456/statistics?hotelId=4821&startDate=2026-03-15&numberOfDays=4&statisticsInstructions=Contract&statisticsInstructions=Pickup&statisticsInstructions=Available&statisticsInstructions=Rates' \
  -H 'x-hotelid: 4821' \
  -H 'x-app-key: {{appKey}}' \
  -H 'Authorization: Bearer {{token}}'
```

---

## Resumen: Evitar Duplicados

| Origen | blockCode | Va a tabla |
|--------|-----------|------------|
| Reserva individual con rooming | CONGRESO2026 | **RESERVAS** |
| Habitación del block sin rooming | CONGRESO2026 | **GRUPOS** |

**La clave es:**
1. Las reservas con `blockCode` ya están en RESERVAS
2. En GRUPOS solo guardas las `available` del block
3. La suma de `pickup` (RESERVAS) + `available` (GRUPOS) = `allocated` (total)

---

## Validación de Consistencia

```sql
-- Verificar que no hay duplicados
SELECT
    g.idgrupo_codigo as block_code,
    g.fecha_pernoctacion,
    g.tipo_habitacion,
    g.habitaciones_pendientes as en_grupos,
    COUNT(r.id) as en_reservas,
    g.habitaciones_contratadas as contratadas
FROM grupos g
LEFT JOIN reservas r ON r.block_code = g.idgrupo_codigo
    AND r.fecha_pernoctacion = g.fecha_pernoctacion
    AND r.tipo_habitacion = g.tipo_habitacion
GROUP BY g.idgrupo_codigo, g.fecha_pernoctacion, g.tipo_habitacion;

-- La suma de en_grupos + en_reservas debe = contratadas
```
