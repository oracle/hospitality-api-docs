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

### Carga Inicial
```
1. Para cada hotel en tu lista:
   2. Dividir el rango de fechas en chunks de 62 días (límite de la API)
   3. Para cada chunk:
      - Llamar a getInventoryStatistics
      - Transformar respuesta
      - INSERT en tabla disponibilidad
```

### Proceso Incremental Diario
```
1. Calcular fecha_ayer = HOY - 1 día
2. Para cada hotel:
   3. Llamar a getInventoryStatistics con dateRangeStart=fecha_ayer y dateRangeEnd=fecha_ayer
   4. Transformar respuesta
   5. Para cada registro:
      - Si existe id_unico → UPDATE
      - Si no existe → INSERT
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
