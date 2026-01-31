# DISPONIBILIDAD - Especificación API Opera Cloud

## Objetivo
Obtener por hotel, día y tipo de habitación:
- Total de habitaciones físicas
- Habitaciones OOO (Out of Order)
- Habitaciones OOS (Out of Service)
- Habitaciones disponibles para venta

---

## Endpoint Principal

```
GET /inv/v1/hotels/{hotelId}/inventoryStatistics
```

**Base URL:** `https://{environment}.oraclecloud.com/inv/v1`

---

## Parámetros de la Llamada

### Path Parameters
| Parámetro | Tipo | Requerido | Descripción |
|-----------|------|-----------|-------------|
| `hotelId` | string | Sí | ID único del hotel (ej: "HOTEL1", "4821") |

### Query Parameters (Requeridos)
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `dateRangeStart` | date | Fecha inicio (formato: YYYY-MM-DD) |
| `dateRangeEnd` | date | Fecha fin (formato: YYYY-MM-DD). **Máximo 62 días de rango** |
| `reportCode` | string | Usar: `RoomsAvailabilitySummary` |

### Query Parameters (Opcionales - Para obtener los datos que necesitas)

Estos parámetros se envían como pares `parameterName` + `parameterValue`:

| parameterName | parameterValue | Descripción |
|---------------|----------------|-------------|
| `RoomPhysicalRoomsYN` | `Y` | **Total de habitaciones físicas por tipo** |
| `RoomOOOYN` | `Y` | **Habitaciones Out of Order por tipo** |
| `RoomOOSRoomsYN` | `Y` | **Habitaciones Out of Service por tipo** |
| `RoomAvailRoomsYN` | `Y` | **Habitaciones disponibles para venta por tipo** |
| `RoomInventoryRoomsYN` | `Y` | Inventario de habitaciones (alternativa) |

### Headers Requeridos
| Header | Descripción |
|--------|-------------|
| `x-hotelid` | ID del hotel |
| `x-app-key` | API Key de la aplicación |
| `Authorization` | Bearer token OAuth2 |
| `Content-Type` | `application/json` |

---

## Ejemplo de Llamada

### Carga Inicial (primeros 62 días)
```bash
curl -X GET \
  'https://{{host}}/inv/v1/hotels/4821/inventoryStatistics?dateRangeStart=2026-01-01&dateRangeEnd=2026-03-03&reportCode=RoomsAvailabilitySummary&parameterName=RoomPhysicalRoomsYN&parameterValue=Y&parameterName=RoomOOOYN&parameterValue=Y&parameterName=RoomOOSRoomsYN&parameterValue=Y&parameterName=RoomAvailRoomsYN&parameterValue=Y' \
  -H 'x-hotelid: 4821' \
  -H 'x-app-key: {{appKey}}' \
  -H 'Authorization: Bearer {{token}}' \
  -H 'Content-Type: application/json'
```

### Proceso Incremental (solo ayer)
```bash
curl -X GET \
  'https://{{host}}/inv/v1/hotels/4821/inventoryStatistics?dateRangeStart=2026-01-29&dateRangeEnd=2026-01-29&reportCode=RoomsAvailabilitySummary&parameterName=RoomPhysicalRoomsYN&parameterValue=Y&parameterName=RoomOOOYN&parameterValue=Y&parameterName=RoomOOSRoomsYN&parameterValue=Y&parameterName=RoomAvailRoomsYN&parameterValue=Y' \
  -H 'x-hotelid: 4821' \
  -H 'x-app-key: {{appKey}}' \
  -H 'Authorization: Bearer {{token}}'
```

---

## Estructura de la Respuesta

```json
[
  {
    "hotelName": "HOTEL1",
    "reportCode": "RoomsAvailabilitySummary",
    "statistics": [
      {
        "statCode": "HOTEL1",
        "statCategoryCode": "HotelCode",
        "statisticDate": [
          { "statisticDate": "2026-01-01", "weekendDate": false },
          { "statisticDate": "2026-01-02", "weekendDate": false }
        ]
      },
      {
        "statCode": "JSUI",
        "statCategoryCode": "HotelRoomCode",
        "statCodeClass": "SUITE",
        "description": "Junior Suite",
        "statisticDate": [
          {
            "statisticDate": "2026-01-01",
            "weekendDate": false,
            "inventory": [
              { "code": "PhysicalRooms", "value": 100 },
              { "code": "OutOfOrder", "value": 10 },
              { "code": "OutOfService", "value": 2 },
              { "code": "AvailableRooms", "value": 88 }
            ]
          },
          {
            "statisticDate": "2026-01-02",
            "weekendDate": false,
            "inventory": [
              { "code": "PhysicalRooms", "value": 100 },
              { "code": "OutOfOrder", "value": 8 },
              { "code": "OutOfService", "value": 0 },
              { "code": "AvailableRooms", "value": 92 }
            ]
          }
        ]
      },
      {
        "statCode": "DBL",
        "statCategoryCode": "HotelRoomCode",
        "statCodeClass": "STANDARD",
        "description": "Double Room",
        "statisticDate": [
          {
            "statisticDate": "2026-01-01",
            "weekendDate": false,
            "inventory": [
              { "code": "PhysicalRooms", "value": 200 },
              { "code": "OutOfOrder", "value": 5 },
              { "code": "OutOfService", "value": 3 },
              { "code": "AvailableRooms", "value": 192 }
            ]
          }
        ]
      }
    ]
  }
]
```

---

## Mapeo a tu Base de Datos

### Tabla: `disponibilidad`

| Campo BD | Campo API | Ubicación en Response |
|----------|-----------|----------------------|
| `idHotel` | hotelId | Path parameter / `hotelName` |
| `fecha` | statisticDate | `statistics[].statisticDate[].statisticDate` |
| `tipo_hab` | statCode | `statistics[].statCode` (donde statCategoryCode = "HotelRoomCode") |
| `total` | PhysicalRooms | `inventory[].value` donde `code` = "PhysicalRooms" |
| `ooo` | OutOfOrder | `inventory[].value` donde `code` = "OutOfOrder" |
| `oos` | OutOfService | `inventory[].value` donde `code` = "OutOfService" |
| `libres` | AvailableRooms | `inventory[].value` donde `code` = "AvailableRooms" |

### Clave Única para Upsert
```
id_unico = CONCAT(idHotel, '-', fecha, '-', tipo_hab)
-- Ejemplo: "4821-2026-01-01-JSUI"
```

---

## Pseudocódigo de Transformación

```python
def transformar_disponibilidad(response, hotel_id):
    registros = []

    for stat in response['statistics']:
        # Solo procesar tipos de habitación (ignorar el registro del hotel)
        if stat['statCategoryCode'] != 'HotelRoomCode':
            continue

        tipo_hab = stat['statCode']

        for date_stat in stat['statisticDate']:
            fecha = date_stat['statisticDate']

            # Extraer valores del inventario
            inventario = {inv['code']: inv['value'] for inv in date_stat.get('inventory', [])}

            registro = {
                'id_unico': f"{hotel_id}-{fecha}-{tipo_hab}",
                'idHotel': hotel_id,
                'fecha': fecha,
                'tipo_hab': tipo_hab,
                'total': inventario.get('PhysicalRooms', 0),
                'ooo': inventario.get('OutOfOrder', 0),
                'oos': inventario.get('OutOfService', 0),
                'libres': inventario.get('AvailableRooms', 0)
            }
            registros.append(registro)

    return registros
```

---

## Lógica de Carga

### Carga Inicial (Históricos - una vez)

Cargar datos desde **2 años atrás hasta ayer**:

```
fecha_inicio = HOY - 2 años
fecha_fin = HOY - 1 día (ayer)

Para cada hotel:
  Mientras fecha_inicio <= fecha_fin:
    bloque_fin = MIN(fecha_inicio + 61 días, fecha_fin)

    1. GET /inv/v1/hotels/{hotelId}/inventoryStatistics
       ?dateRangeStart={fecha_inicio}&dateRangeEnd={bloque_fin}
       &reportCode=RoomsAvailabilitySummary
       &parameterName=RoomPhysicalRoomsYN&parameterValue=Y
       &parameterName=RoomOOOYN&parameterValue=Y
       &parameterName=RoomOOSRoomsYN&parameterValue=Y
       &parameterName=RoomAvailRoomsYN&parameterValue=Y

    2. Transformar respuesta
    3. INSERT en tabla disponibilidad

    fecha_inicio = bloque_fin + 1 día
```

**Ejemplo para 2 años (730 días):**
- Necesitas ~12 llamadas por hotel (730 / 62 = 11.8)

---

### Proceso Diario

Ejecutar cada día: desde **3 días atrás hasta 31 de diciembre del año siguiente**:

```
fecha_inicio = HOY - 3 días
fecha_fin = 31 de diciembre del año siguiente

Para cada hotel:
  Mientras fecha_inicio <= fecha_fin:
    bloque_fin = MIN(fecha_inicio + 61 días, fecha_fin)

    1. GET /inv/v1/hotels/{hotelId}/inventoryStatistics
       ?dateRangeStart={fecha_inicio}&dateRangeEnd={bloque_fin}
       ...

    2. Transformar respuesta

    3. Para cada registro:
       - Buscar en BD por id_unico (idHotel-fecha-tipo_hab)
       - Si existe → UPDATE
       - Si no existe → INSERT

    fecha_inicio = bloque_fin + 1 día
```

**Ejemplo (ejecutado el 31 de enero de 2026):**
- fecha_inicio = 28 enero 2026 (HOY - 3)
- fecha_fin = 31 diciembre 2027
- Rango total = ~700 días
- Llamadas necesarias = ~12 por hotel

---

### Ejemplo de Llamadas Diarias

```bash
# Bloque 1: 28 enero 2026 → 30 marzo 2026 (62 días)
GET /inv/v1/hotels/4821/inventoryStatistics?dateRangeStart=2026-01-28&dateRangeEnd=2026-03-30&...

# Bloque 2: 31 marzo 2026 → 31 mayo 2026
GET /inv/v1/hotels/4821/inventoryStatistics?dateRangeStart=2026-03-31&dateRangeEnd=2026-05-31&...

# ... continuar hasta 31 diciembre 2027
```

---

### Lógica de Upsert

```python
def upsert_disponibilidad(registros, connection):
    """
    Inserta o actualiza registros de disponibilidad.
    Clave única: idHotel + fecha + tipo_hab
    """
    for registro in registros:
        id_unico = registro['id_unico']

        # Buscar si existe
        existing = db.query(
            "SELECT id FROM disponibilidad WHERE id_unico = ?",
            id_unico
        )

        if existing:
            # UPDATE
            db.execute("""
                UPDATE disponibilidad
                SET total = ?, ooo = ?, oos = ?, libres = ?,
                    fecha_actualizacion = CURRENT_TIMESTAMP
                WHERE id_unico = ?
            """, (
                registro['total'],
                registro['ooo'],
                registro['oos'],
                registro['libres'],
                id_unico
            ))
        else:
            # INSERT
            db.execute("""
                INSERT INTO disponibilidad
                (id_unico, idHotel, fecha, tipo_hab, total, ooo, oos, libres)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                id_unico,
                registro['idHotel'],
                registro['fecha'],
                registro['tipo_hab'],
                registro['total'],
                registro['ooo'],
                registro['oos'],
                registro['libres']
            ))

# Alternativa SQL con ON CONFLICT (PostgreSQL)
"""
INSERT INTO disponibilidad (id_unico, idHotel, fecha, tipo_hab, total, ooo, oos, libres)
VALUES (?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT (id_unico) DO UPDATE SET
    total = EXCLUDED.total,
    ooo = EXCLUDED.ooo,
    oos = EXCLUDED.oos,
    libres = EXCLUDED.libres,
    fecha_actualizacion = CURRENT_TIMESTAMP;
"""
```

---

## Limitaciones de la API

| Limitación | Valor |
|------------|-------|
| Rango máximo de fechas | **62 días** |
| Máximo registros por respuesta | 4000 |

---

## Códigos de Respuesta HTTP

| Código | Descripción |
|--------|-------------|
| 200 | OK - Datos devueltos correctamente |
| 204 | No Content - No hay datos para los criterios |
| 400 | Bad Request - Parámetros inválidos |
| 401 | Unauthorized - Token inválido |
| 403 | Forbidden - Sin permisos |
| 404 | Not Found - Hotel no encontrado |

---

## Notas Importantes

1. **El campo `statCategoryCode`**: Filtra por `HotelRoomCode` para obtener solo tipos de habitación. El valor `HotelCode` es un resumen a nivel de hotel.

2. **Códigos de inventario posibles** (según parámetros solicitados):
   - `PhysicalRooms` - Total físico
   - `OutOfOrder` - OOO
   - `OutOfService` - OOS
   - `AvailableRooms` - Disponibles
   - `RoomsSold` - Vendidas
   - `Occupancy` - Ocupadas

3. **Para obtener datos a nivel CASA (totales del hotel)**, usa los parámetros `House*YN` en lugar de `Room*YN`:
   - `HousePhysicalRoomsYN`
   - `HouseOOOYN`
   - `HouseOOSRoomsYN`
   - `HouseAvailRoomsYN`
