# PRODUCCIONES (Ingresos por Outlet) - Opera Cloud API

## Objetivo
Extraer los ingresos diarios del hotel desglosados por outlet (bar, restaurante, parking, excursiones, etc.) para los dias cerrados.

## Endpoint Principal

### GET /csh/v1/hotels/{hotelId}/financialPostings

Obtiene todas las transacciones financieras (postings) del hotel en un rango de fechas.

**Limitaciones:**
- Maximo 30 dias por llamada
- Maximo 50 registros por pagina (usar paginacion)

## Parametros de Request

| Parametro | Tipo | Requerido | Descripcion |
|-----------|------|-----------|-------------|
| hotelId | path | Si | Codigo del hotel |
| startDate | query | No | Fecha inicio (YYYY-MM-DD) |
| endDate | query | No | Fecha fin (YYYY-MM-DD) |
| filterTransactionCode | query | No | Filtrar por codigos de transaccion especificos |
| limit | query | No | Registros por pagina (max 50) |
| offset | query | No | Indice para paginacion |

## Estructura de Respuesta

```json
{
  "journalPostings": {
    "postings": [
      {
        "transactionNo": 123456,
        "transactionCode": "5010",
        "transactionDescription": "Bar Beverage",
        "transactionDate": "2024-01-15",
        "revenueDate": "2024-01-15",
        "postedAmount": {
          "amount": 45.50,
          "currencyCode": "EUR"
        },
        "transactionType": "Revenue",
        "creditAmount": {
          "amount": 45.50,
          "currencyCode": "EUR"
        },
        "debitAmount": {
          "amount": 0,
          "currencyCode": "EUR"
        }
      }
    ],
    "transactionCodes": [
      {
        "transactionCode": "5010",
        "description": "Bar Beverage",
        "transactionGroup": "F&B",
        "transactionSubGroup": "BAR"
      },
      {
        "transactionCode": "5020",
        "description": "Restaurant Food",
        "transactionGroup": "F&B",
        "transactionSubGroup": "REST"
      },
      {
        "transactionCode": "9000",
        "description": "Room Revenue",
        "transactionGroup": "Rooms",
        "transactionSubGroup": "LODGING"
      }
    ],
    "totalDebit": {
      "amount": 0,
      "currencyCode": "EUR"
    },
    "totalCredit": {
      "amount": 15420.75,
      "currencyCode": "EUR"
    }
  },
  "totalResults": 342,
  "hasMore": true,
  "limit": 50,
  "offset": 0
}
```

## Campos Clave para PRODUCCIONES

### En cada posting:

| Campo API | Campo Destino | Descripcion |
|-----------|---------------|-------------|
| hotelId (header) | idhotel | Codigo del hotel |
| revenueDate | fecha | Fecha de ingreso (dia cerrado) |
| transactionCode | outlet_code | Codigo del outlet/concepto |
| transactionDescription | outlet | Descripcion del outlet |
| postedAmount.amount | importe | Importe de la transaccion |
| postedAmount.currencyCode | moneda | Moneda (EUR, USD, etc.) |
| transactionType | - | Filtrar solo "Revenue" |

### En transactionCodes (para mapeo):

| Campo API | Campo Destino | Descripcion |
|-----------|---------------|-------------|
| transactionCode | - | Codigo para relacionar |
| transactionGroup | agrupacion | Grupo principal (F&B, Rooms, Other) |
| transactionSubGroup | - | Subgrupo mas especifico |
| description | outlet | Nombre del outlet |

## Identificacion de Impuestos

Opera Cloud incluye transacciones de impuestos auto-generadas. Para obtener importes SIN impuestos:

### Opcion 1: Excluir por Transaction Group
Los impuestos suelen tener `transactionGroup` = "Taxes" o similar. Consultar la configuracion del hotel.

### Opcion 2: Excluir por Transaction Code
Los codigos de impuestos tipicamente empiezan con patrones especificos (ej: "TAX", "IVA", "VAT").

### Opcion 3: Usar Endpoint Alternativo (por reserva)
`GET /csh/v1/hotels/{hotelId}/financialPostingsNetVat` devuelve `netAmount` y `grossAmount` separados, pero requiere `reservationId` (no util para extraccion masiva).

### Recomendacion
Crear un mapeo de transaction codes que son impuestos vs revenue en su sistema y filtrar al agregar.

## Proceso de Extraccion

### Proceso Diario
Ejecutar cada dia para los ultimos 4-5 dias cerrados (por seguridad ante ajustes tardios):

```
Para cada hotel:
  1. GET /csh/v1/hotels/{hotelId}/financialPostings
     ?startDate={hoy-5}&endDate={hoy-1}
     &limit=50

  2. Iterar paginas mientras hasMore=true (incrementar offset)

  3. Filtrar postings donde transactionType = "Revenue"

  4. Agregar por fecha + transactionCode:
     - Sumar postedAmount.amount
     - Mapear transactionCode -> transactionGroup (agrupacion)

  5. Excluir transaction codes que son impuestos

  6. Upsert en base de datos
```

### Ejemplo de Llamadas

```bash
# Dia 1: obtener transacciones de los ultimos 5 dias
GET /csh/v1/hotels/HOTEL1/financialPostings?startDate=2024-01-10&endDate=2024-01-14&limit=50&offset=0

# Si hasMore=true, pagina 2
GET /csh/v1/hotels/HOTEL1/financialPostings?startDate=2024-01-10&endDate=2024-01-14&limit=50&offset=50

# Continuar hasta hasMore=false
```

## Estructura de Tabla Destino

```sql
CREATE TABLE producciones (
    id SERIAL PRIMARY KEY,
    idhotel VARCHAR(20) NOT NULL,
    fecha DATE NOT NULL,
    transaction_code VARCHAR(20) NOT NULL,
    outlet VARCHAR(200),
    agrupacion VARCHAR(50),           -- F&B, Rooms, Other, etc.
    importe DECIMAL(15,2),            -- SIN impuestos (filtrado)
    moneda VARCHAR(3),
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (idhotel, fecha, transaction_code)
);

-- Indice para upsert
CREATE INDEX idx_producciones_lookup
ON producciones(idhotel, fecha, transaction_code);
```

## ID Unico para Upsert

```
{idhotel}-{fecha}-{transaction_code}
```

Ejemplo: `HOTEL1-2024-01-15-5010`

## Agrupaciones Tipicas (transactionGroup)

| transactionGroup | Descripcion |
|------------------|-------------|
| Rooms | Ingresos de alojamiento |
| F&B | Food & Beverage (restaurante, bar, minibar) |
| Other | Otros servicios (parking, excursiones, spa, etc.) |
| Taxes | Impuestos (EXCLUIR) |
| Payments | Pagos recibidos (EXCLUIR - no es revenue) |

## Mapeo de Outlets Comunes

| Transaction Code (ejemplo) | Outlet | Agrupacion |
|---------------------------|--------|------------|
| 1000-1999 | Room Revenue | Rooms |
| 5000-5099 | Bar Beverage | F&B |
| 5100-5199 | Bar Food | F&B |
| 5200-5299 | Restaurant Beverage | F&B |
| 5300-5399 | Restaurant Food | F&B |
| 5400-5499 | Minibar | F&B |
| 6000-6099 | Parking | Other |
| 6100-6199 | Laundry | Other |
| 6200-6299 | Spa | Other |
| 6300-6399 | Excursions | Other |
| 9000-9999 | Taxes | Taxes (excluir) |

**Nota:** Los codigos de transaccion son configurables por hotel. Consultar la configuracion especifica de cada propiedad.

## Endpoint para Obtener Codigos de Transaccion

### GET /lov/v1/listOfValues/hotels/{hotelId}/transactionCodes

Devuelve todos los transaction codes configurados para el hotel con sus grupos y descripciones.

```json
{
  "listOfValues": [
    {
      "code": "5010",
      "description": "Bar Beverage",
      "transactionGroup": "F&B",
      "transactionSubGroup": "BAR"
    }
  ]
}
```

**Recomendacion:** Extraer esta lista una vez y mantener un mapeo local de codigos a grupos.

## Notas Importantes

1. **revenueDate vs transactionDate**: Usar `revenueDate` que es la fecha efectiva del ingreso (puede diferir de la fecha de posting)

2. **Paginacion**: El endpoint tiene limite de 50 registros. Hoteles grandes pueden tener cientos de transacciones diarias.

3. **Transacciones negativas**: Pueden existir por anulaciones/ajustes. Incluirlas en la suma.

4. **Moneda**: Verificar que todos los postings esten en la moneda local del hotel o convertir si es necesario.

5. **Hora de ejecucion**: Ejecutar despues del cierre nocturno (night audit) para asegurar datos completos del dia anterior.

6. **Seguridad con 4-5 dias**: Algunos ajustes pueden postearse con fechas retroactivas. Procesar varios dias atras asegura capturar todo.
