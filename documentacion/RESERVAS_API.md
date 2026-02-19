# RESERVAS - Especificación API Opera Cloud

## Objetivo
Obtener datos de reservas con granularidad de **1 registro = 1 noche de 1 habitación de 1 reserva**, incluyendo:
- Información de la reserva
- Detalles de cada noche de estancia
- Importes por noche (sin impuestos)
- Posibilidad de filtrar por fecha de modificación para proceso incremental

---

## Endpoint Principal (Recomendado)

### API Asíncrona - Reservations Daily Summary

Este endpoint devuelve las reservas con su detalle diario, y permite filtrar por fecha de modificación.

```
POST /rsv/async/v1/externalSystems/{extSystemCode}/hotels/{hotelId}/reservations/dailySummary
```

**Patrón Async-Polling:**
1. `POST` → Inicia el proceso, devuelve `Location` header
2. `HEAD` en Location → Verifica estado (`Processing`, `Completed`)
3. `GET` en Location → Obtiene los resultados

**Límite de fechas:** Máximo **94 días** por llamada

---

## Flujo de Llamadas

### Paso 1: Iniciar el proceso
```bash
POST /rsv/async/v1/externalSystems/{extSystemCode}/hotels/{hotelId}/reservations/dailySummary

# Body para CARGA INICIAL (por rango de fechas de estancia)
{
  "criteria": {
    "hotelId": "4821",
    "timeSpan": {
      "startDate": "2026-01-01",
      "endDate": "2026-03-31"
    }
  }
}

# Body para PROCESO INCREMENTAL (por fecha de modificación)
{
  "criteria": {
    "hotelId": "4821",
    "lastModifiedDate": {
      "startLastModifiedDate": "2026-01-29T00:00:00",
      "endLastModifiedDate": "2026-01-29T23:59:59"
    }
  }
}
```

**Response:** `202 Accepted` con header `Location: /rsv/async/v1/externalSystems/{extSystemCode}/hotels/{hotelId}/reservations/dailySummary/{summaryId}`

### Paso 2: Verificar estado
```bash
HEAD /rsv/async/v1/externalSystems/{extSystemCode}/hotels/{hotelId}/reservations/dailySummary/{summaryId}
```

**Responses:**
- `200` con `Status: Processing` → Seguir esperando
- `201` con `Status: Completed` y nuevo `Location` → Listo para obtener resultados

### Paso 3: Obtener resultados
```bash
GET /rsv/async/v1/externalSystems/{extSystemCode}/hotels/{hotelId}/reservations/dailySummary/{summaryId}
```

---

## Estructura de la Respuesta

```json
{
  "reservations": [
    {
      "hotelId": "4821",
      "reservationIdList": [
        { "id": "12345", "type": "Reservation" },
        { "id": "CONF123456", "type": "Confirmation" }
      ],
      "resvStatus": "RESERVED",
      "arrival": "2026-01-15T00:00:00",
      "departure": "2026-01-18T00:00:00",
      "bookingDate": "2026-01-10T14:30:00",
      "cancellationDate": null,
      "noOfRooms": 1,
      "adults": 2,
      "children1": 1,
      "children2": 0,
      "children3": 0,
      "travelAgentId": { "id": "5678", "type": "TravelAgent" },
      "travelAgentName": "Viajes El Corte Inglés",
      "companyId": { "id": "9012", "type": "Company" },
      "companyName": "Acme Corp",
      "bookingMedium": "WEB",
      "createDateTime": "2026-01-10T14:30:00",
      "lastModifiedDateTime": "2026-01-28T10:15:00",
      "dailySummary": [
        {
          "trxDate": "2026-01-15T00:00:00",
          "rateCode": "BAR",
          "rateAmount": 150.00,
          "rateAmountCurrency": "EUR",
          "netRateAmount": 135.00,
          "roomRevenue": 135.00,
          "roomRevenueCurrency": "EUR",
          "tax": 15.00,
          "taxCurrency": "EUR",
          "roomType": "JSUI",
          "bookedRoomType": "JSUI",
          "room": "401",
          "marketCode": "LEISURE",
          "sourceCode": "DIRECT",
          "channel": "WEB",
          "adults": 2,
          "children": 1
        },
        {
          "trxDate": "2026-01-16T00:00:00",
          "rateCode": "BAR",
          "rateAmount": 150.00,
          "rateAmountCurrency": "EUR",
          "netRateAmount": 135.00,
          "roomRevenue": 135.00,
          "roomRevenueCurrency": "EUR",
          "tax": 15.00,
          "taxCurrency": "EUR",
          "roomType": "JSUI",
          "bookedRoomType": "JSUI",
          "room": "401",
          "marketCode": "LEISURE",
          "sourceCode": "DIRECT",
          "channel": "WEB",
          "adults": 2,
          "children": 1
        },
        {
          "trxDate": "2026-01-17T00:00:00",
          "rateCode": "BAR",
          "rateAmount": 180.00,
          "rateAmountCurrency": "EUR",
          "netRateAmount": 162.00,
          "roomRevenue": 162.00,
          "roomRevenueCurrency": "EUR",
          "tax": 18.00,
          "taxCurrency": "EUR",
          "roomType": "JSUI",
          "bookedRoomType": "JSUI",
          "room": "401",
          "marketCode": "LEISURE",
          "sourceCode": "DIRECT",
          "channel": "WEB",
          "adults": 2,
          "children": 1
        }
      ]
    }
  ]
}
```

---

## Mapeo a tu Base de Datos

### Tabla: `reservas`

| Campo BD | Campo API | Ubicación en Response | Notas |
|----------|-----------|----------------------|-------|
| `idhotel` | hotelId | `reservations[].hotelId` | |
| `idreserva` | reservationId | `reservations[].reservationIdList[type=Reservation].id` | |
| `idsubreserva` | room + trxDate | **Ver nota abajo** | Concatenar para crear ID único de habitación-noche |
| `fecha_reserva` | bookingDate | `reservations[].bookingDate` | |
| `fecha_pernoctacion` | trxDate | `reservations[].dailySummary[].trxDate` | Una por cada noche |
| `tipo_habitacion` | roomType | `reservations[].dailySummary[].roomType` | |
| `regimen_alimenticio` | - | **Derivar de rateCode** | Ver nota abajo |
| `tarifa` | rateCode | `reservations[].dailySummary[].rateCode` | |
| `canal` | channel / bookingMedium | `reservations[].dailySummary[].channel` o `reservations[].bookingMedium` | |
| `segmento` | marketCode | `reservations[].dailySummary[].marketCode` | |
| `agencia` | travelAgentName | `reservations[].travelAgentName` | |
| `estado` | resvStatus | `reservations[].resvStatus` | Ver tabla de estados |
| `fecha_cancelacion` | cancellationDate | `reservations[].cancellationDate` | |
| `adultos` | adults | `reservations[].dailySummary[].adults` | Por noche |
| `juniors` | children1 | `reservations[].children1` | Depende de config del hotel |
| `niños` | children | `reservations[].dailySummary[].children` | Por noche |
| `importe_alojamiento` | netRateAmount | `reservations[].dailySummary[].netRateAmount` | **Sin impuestos** |
| `moneda` | netRateAmountCurrency | `reservations[].dailySummary[].netRateAmountCurrency` | |
| `fecha_actualizacion` | lastModifiedDateTime | `reservations[].lastModifiedDateTime` | |
| `fecha_nacimiento` | birthDate | **Ver PERFILES_HUESPED_API.md** | Enriquecido posteriormente |
| `profile_id` | profileId | **Ver PERFILES_HUESPED_API.md** | Para enriquecimiento |

**Nota:** Los campos `fecha_nacimiento` y `profile_id` se rellenan mediante el proceso de enriquecimiento de perfiles (ver `PERFILES_HUESPED_API.md`). Inicialmente se guardan como `NULL` y se actualizan en un proceso posterior.

### Clave Única para Upsert
```
id_unico = CONCAT(idHotel, '-', idReserva, '-', room, '-', fecha_pernoctacion)
Ejemplo: "4821-12345-401-2026-01-15"
```

---

## Estados de Reserva (resvStatus)

| Estado API | Descripción |
|------------|-------------|
| `RESERVED` | Confirmada, pendiente de llegada |
| `REQUESTED` | Solicitada, pendiente de confirmación |
| `NO SHOW` | No se presentó |
| `CANCELLED` | Cancelada |
| `IN HOUSE` | En casa (durante la estancia) |
| `CHECKED IN` | Check-in realizado |
| `CHECKED OUT` | Check-out realizado |
| `WAITLIST` | En lista de espera |
| `DUE IN` | Llegada prevista hoy |
| `DUE OUT` | Salida prevista hoy |
| `WALKIN` | Walk-in (sin reserva previa) |
| `PENDING CHECKOUT` | Pendiente de check-out |
| `PROSPECT` | Prospecto |

---

## Nota sobre Régimen Alimenticio (Meal Plan)

Opera Cloud no tiene un campo específico de "régimen alimenticio" en la respuesta. El meal plan generalmente está codificado dentro del `rateCode`. Opciones:

### Opción 1: Mapear desde rateCode
Crear una tabla de mapeo basada en tus códigos de tarifa:
```
BAR_RO → Room Only
BAR_BB → Bed & Breakfast
BAR_HB → Half Board
BAR_FB → Full Board
BAR_AI → All Inclusive
```

### Opción 2: Usar el endpoint de Rate Plans
```
GET /rtp/v1/hotels/{hotelId}/ratePlans/{ratePlanCode}
```
Este endpoint devuelve el detalle del rate plan, incluyendo los paquetes asociados (que pueden indicar el meal plan).

### Opción 3: Revisar packages en la reserva
Si necesitas más detalle, usar el endpoint síncrono:
```
GET /rsv/v1/hotels/{hotelId}/reservations/{reservationId}
```
Con `fetchInstructions=Packages` para obtener los paquetes asociados.

---

## Nota sobre Multi-Room Reservations (idsubreserva)

El Daily Summary agrupa por reserva, pero incluye en `dailySummary` el campo `room` (número de habitación). Para reservas multi-habitación:

1. **Si cada habitación tiene diferente `room` number**, usar `room` como parte del id_unico
2. **Si no hay `room` asignado**, las diferentes habitaciones aparecerán como múltiples registros en `dailySummary` con la misma `trxDate`

**Alternativa más robusta**: Usar el endpoint detallado de reserva:
```
GET /rsv/v1/hotels/{hotelId}/reservations/{reservationId}
```
Este endpoint devuelve la estructura completa con `roomStay[]` y `roomRates[]` que identifican claramente cada habitación de la reserva.

---

## Pseudocódigo de Transformación

```python
def transformar_reservas(response, hotel_id, fecha_proceso):
    registros = []

    for reserva in response['reservations']:
        # Datos a nivel de reserva
        id_reserva = next(
            (r['id'] for r in reserva.get('reservationIdList', [])
             if r.get('type') == 'Reservation'),
            None
        )

        datos_reserva = {
            'idhotel': hotel_id,
            'idreserva': id_reserva,
            'fecha_reserva': reserva.get('bookingDate'),
            'agencia': reserva.get('travelAgentName'),
            'estado': reserva.get('resvStatus'),
            'fecha_cancelacion': reserva.get('cancellationDate'),
            'fecha_actualizacion': reserva.get('lastModifiedDateTime') or fecha_proceso
        }

        # Datos a nivel de día (cada noche)
        for dia in reserva.get('dailySummary', []):
            room = dia.get('room', 'UNASSIGNED')
            fecha_pernoctacion = dia.get('trxDate', '').split('T')[0]

            registro = {
                **datos_reserva,
                'id_unico': f"{hotel_id}-{id_reserva}-{room}-{fecha_pernoctacion}",
                'idsubreserva': f"{id_reserva}-{room}",
                'fecha_pernoctacion': fecha_pernoctacion,
                'tipo_habitacion': dia.get('roomType'),
                'tarifa': dia.get('rateCode'),
                'canal': dia.get('channel') or reserva.get('bookingMedium'),
                'segmento': dia.get('marketCode'),
                'adultos': dia.get('adults'),
                'niños': dia.get('children'),
                'importe_alojamiento': dia.get('netRateAmount'),
                'moneda': dia.get('netRateAmountCurrency'),
                # Régimen: derivar de rateCode o lookup
                'regimen_alimenticio': derivar_regimen(dia.get('rateCode'))
            }
            registros.append(registro)

    return registros

def derivar_regimen(rate_code):
    """Mapear rateCode a régimen alimenticio"""
    if not rate_code:
        return None

    rate_upper = rate_code.upper()
    if '_RO' in rate_upper or 'ROOM' in rate_upper:
        return 'ROOM_ONLY'
    elif '_BB' in rate_upper or 'BREAKFAST' in rate_upper:
        return 'BED_BREAKFAST'
    elif '_HB' in rate_upper or 'HALF' in rate_upper:
        return 'HALF_BOARD'
    elif '_FB' in rate_upper or 'FULL' in rate_upper:
        return 'FULL_BOARD'
    elif '_AI' in rate_upper or 'ALL' in rate_upper:
        return 'ALL_INCLUSIVE'
    else:
        return 'UNKNOWN'  # Requerirá mapeo manual
```

---

## Lógica de Carga

### Carga Inicial
```
1. Para cada hotel en tu lista:
   2. Dividir el rango de fechas en chunks de 94 días (límite de la API)
   3. Para cada chunk:
      a. POST para iniciar proceso
      b. Polling HEAD hasta completado
      c. GET para obtener resultados
      d. Transformar datos
      e. INSERT en tabla reservas
```

### Proceso Incremental Diario
```
1. Calcular fecha_ayer = HOY - 1 día
2. Para cada hotel:
   3. POST con lastModifiedDate = ayer (00:00:00 a 23:59:59)
   4. Polling HEAD hasta completado
   5. GET para obtener resultados
   6. Transformar datos
   7. Para cada registro:
      - Si existe id_unico → UPDATE (incluyendo fecha_actualizacion)
      - Si no existe → INSERT
```

### Lógica para Detectar Noches Huérfanas
```sql
-- Después del proceso incremental, detectar noches "huérfanas"
-- (noches que ya no existen en la reserva pero quedaron en BD)

WITH reservas_actualizadas AS (
    SELECT DISTINCT idreserva, idsubreserva, fecha_actualizacion
    FROM reservas
    WHERE fecha_actualizacion = DATE('yesterday')
)
SELECT r.*
FROM reservas r
JOIN reservas_actualizadas ra
    ON r.idreserva = ra.idreserva
    AND r.idsubreserva = ra.idsubreserva
WHERE r.fecha_actualizacion < ra.fecha_actualizacion;

-- Estas son las noches que fueron eliminadas de la reserva
-- Puedes marcarlas como 'DELETED' o eliminarlas según tu lógica
```

---

## Campos Adicionales Disponibles

### A nivel de RESERVA (datos del huésped principal)

| Campo | Descripción | Notas |
|-------|-------------|-------|
| `nationality` | Nacionalidad del huésped principal | Código ISO país |
| `guestCountry` | País de residencia del huésped principal | De su dirección principal |
| `resvType` | Tipo de reserva | |
| `noOfRooms` | Número de habitaciones en la reserva | Para multi-room |
| `sharedYn` | Indica si la reserva tiene sharers | Y/N |
| `sharersList` | Lista de confirmation numbers de sharers | |
| `checkedOutDate` | Fecha real de check-out | |
| `cancellationReasonCode` | Motivo de cancelación | Si está cancelada |

### A nivel de RESERVA (datos de perfiles asociados)

| Campo | Descripción | Notas |
|-------|-------------|-------|
| `companyId` / `companyName` | Empresa asociada | |
| `travelAgentId` / `travelAgentName` | Agencia de viajes | |
| `iataCode` | Código IATA de la agencia | |
| `groupId` / `groupName` | Grupo al que pertenece | |
| `blockCode` | **Código del bloque/rooming list** | Ver nota abajo |
| `sourceId` / `sourceName` | Fuente de la reserva | |
| `resvContactId` / `resvContactName` | Contacto de la reserva | |

### A nivel de RESERVA (datos de fidelización)

| Campo | Descripción |
|-------|-------------|
| `membershipId` / `membershipNumber` | Número de tarjeta de fidelización |
| `membershipType` | Tipo de programa (ej: "LOYALTY") |
| `membershipLevel` | Nivel del huésped (ej: "GOLD", "PLATINUM") |

### A nivel de DÍA (dailySummary) - Ingresos

| Campo | Descripción | Notas |
|-------|-------------|-------|
| `rateAmount` | Importe bruto de la tarifa | Con impuestos incluidos |
| `netRateAmount` | **Importe neto de la tarifa** | **SIN impuestos** (usar este) |
| `roomRevenue` | Ingresos de habitación | |
| `fbRevenue` | Ingresos de F&B | |
| `otherRevenue` | Otros ingresos | |
| `totalRevenue` | Ingresos totales | |
| `packageRevenue` | Ingresos de paquetes | |
| `tax` | Importe de impuestos | |

---

## Nota sobre `blockCode` (Bloques y Rooming Lists)

En Opera Cloud, los **grupos** se gestionan como **Blocks**:

- Un **Block** representa un grupo/convención/evento con múltiples habitaciones reservadas
- Cada Block tiene un código único (`blockCode`)
- Las reservas individuales del **rooming list** heredan el `blockCode`
- También viene `groupId` y `groupName` para información adicional

**Ejemplo:**
```
Block: "CONGRESO2026" (100 habitaciones)
├── Reserva 12345 (blockCode: "CONGRESO2026", groupName: "Congreso Nacional")
├── Reserva 12346 (blockCode: "CONGRESO2026", groupName: "Congreso Nacional")
└── ...
```

---

## Limitación: Edad del Huésped (birthDate)

**La fecha de nacimiento NO viene en el Daily Summary.**

El `birthDate` está en el **perfil del huésped** (CRM) y el Daily Summary no incluye el `profileId` necesario para consultarlo.

### Opciones para obtener la edad:

| Opción | Complejidad | Proceso |
|--------|-------------|---------|
| **A. No incluirla** | Ninguna | Aceptar que no está disponible en este endpoint |
| **B. Endpoint síncrono** | Media | 1. Para cada reserva, llamar a `GET /rsv/v1/hotels/{hotelId}/reservations/{reservationId}` que devuelve `profileId`<br>2. Llamar a `GET /crm/v1/profiles/{profileId}` para obtener `birthDate` |
| **C. Extracción paralela** | Alta | 1. Extraer todos los perfiles del CRM con `GET /crm/v1/profiles`<br>2. Cruzar en tu BD por nombre/email |

### Si eliges Opción B (recomendada para enriquecimiento):

```bash
# 1. Obtener detalle de reserva con profileId
GET /rsv/v1/hotels/{hotelId}/reservations/{reservationId}?fetchInstructions=ReservationGuests

# Response incluye:
{
  "reservationGuests": [{
    "profileInfo": {
      "profileIdList": [{ "id": "789012", "type": "Profile" }]
    }
  }]
}

# 2. Obtener perfil con birthDate
GET /crm/v1/profiles/{profileId}

# Response incluye:
{
  "birthDate": "1985-03-15",
  "birthDateMasked": "****-**-15"  # Versión enmascarada por privacidad
}
```

**Nota:** Esto añade 2 llamadas adicionales por reserva. Considera hacerlo solo para reservas nuevas o como proceso batch separado.

---

## Limitaciones de la API

| Limitación | Valor |
|------------|-------|
| Rango máximo de fechas (timeSpan) | **94 días** |
| Máximo reservas por respuesta | 4000 |
| Tiempo máximo de proceso async | Varía según volumen |

---

## Headers Requeridos

| Header | Descripción |
|--------|-------------|
| `x-hotelid` | ID del hotel |
| `x-app-key` | API Key de la aplicación |
| `Authorization` | Bearer token OAuth2 |
| `Content-Type` | `application/json` |

---

## Códigos de Respuesta HTTP

| Código | Descripción |
|--------|-------------|
| 202 | Accepted - Proceso iniciado |
| 200 | OK (HEAD) - Proceso en curso |
| 201 | Created (HEAD) - Proceso completado |
| 200 | OK (GET) - Resultados disponibles |
| 204 | No Content - Sin reservas para los criterios |
| 400 | Bad Request - Parámetros inválidos |
| 401 | Unauthorized - Token inválido |

---

## Ejemplo Completo con cURL

### 1. Iniciar proceso (Incremental - modificados ayer)
```bash
curl -X POST \
  'https://{{host}}/rsv/async/v1/externalSystems/{{extSystemCode}}/hotels/4821/reservations/dailySummary' \
  -H 'x-hotelid: 4821' \
  -H 'x-app-key: {{appKey}}' \
  -H 'Authorization: Bearer {{token}}' \
  -H 'Content-Type: application/json' \
  -d '{
    "criteria": {
      "hotelId": "4821",
      "lastModifiedDate": {
        "startLastModifiedDate": "2026-01-29T00:00:00",
        "endLastModifiedDate": "2026-01-29T23:59:59"
      }
    }
  }' \
  -i  # Para ver headers, incluyendo Location
```

### 2. Verificar estado
```bash
curl -X HEAD \
  'https://{{host}}/rsv/async/v1/externalSystems/{{extSystemCode}}/hotels/4821/reservations/dailySummary/{{summaryId}}' \
  -H 'x-hotelid: 4821' \
  -H 'x-app-key: {{appKey}}' \
  -H 'Authorization: Bearer {{token}}' \
  -i
```

### 3. Obtener resultados
```bash
curl -X GET \
  'https://{{host}}/rsv/async/v1/externalSystems/{{extSystemCode}}/hotels/4821/reservations/dailySummary/{{summaryId}}' \
  -H 'x-hotelid: 4821' \
  -H 'x-app-key: {{appKey}}' \
  -H 'Authorization: Bearer {{token}}'
```
