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
| **transactionNo** | **id_transaccion** | **ID unico de la transaccion (para upsert)** |
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

## Obtencion de Importes SIN Impuestos

Opera Cloud auto-genera transacciones de impuestos. Para obtener importes netos hay dos enfoques:

---

### Enfoque Recomendado: Configuracion de Transaction Codes

#### Endpoint de Configuracion

**GET /fof/cfg/v1/transactionCodes?hotelIds={hotelId}**

Devuelve la configuracion completa de todos los transaction codes incluyendo:
- Tipo de transaccion (si es impuesto o revenue)
- Impuestos que genera automaticamente cada codigo
- Porcentaje de cada impuesto

#### Estructura de Respuesta

```json
{
  "transactionCodes": [
    {
      "code": "5010",
      "hotelId": "HOTEL1",
      "description": "Bar Beverage",
      "classification": {
        "type": "Revenue",
        "transactionType": {
          "code": "FoodAndBeverage"
        },
        "group": {
          "code": "F&B",
          "description": "Food and Beverage"
        },
        "subgroup": {
          "code": "BAR",
          "description": "Bar"
        }
      },
      "generatesSetup": {
        "generates": [
          {
            "code": "9010",
            "description": "IVA 10%",
            "rule": {
              "percentage": {
                "amount": 10.0,
                "calculatedOn": "Base"
              }
            }
          },
          {
            "code": "9020",
            "description": "City Tax",
            "rule": {
              "flatAmount": {
                "amount": 1.50
              }
            }
          }
        ]
      }
    },
    {
      "code": "9010",
      "description": "IVA 10%",
      "classification": {
        "type": "Revenue",
        "transactionType": {
          "code": "Tax",
          "taxCode": 1
        },
        "group": {
          "code": "TAX",
          "description": "Taxes"
        }
      }
    }
  ]
}
```

#### Campos Clave para Identificar Impuestos

| Campo | Valor | Significado |
|-------|-------|-------------|
| `classification.transactionType.code` | `Tax` | Es un codigo de impuesto |
| `classification.transactionType.code` | `Lodging`, `FoodAndBeverage`, `Minibar`, `Others` | Es revenue |
| `generatesSetup.generates[].rule.percentage.amount` | `10.0` | 10% de impuesto |
| `generatesSetup.generates[].rule.flatAmount.amount` | `1.50` | Impuesto fijo |

#### Tipos de Transaction Code (`transactionType.code`)

| Tipo | Descripcion |
|------|-------------|
| Lodging | Alojamiento |
| FoodAndBeverage | Comida y bebida |
| Telephone | Telefono |
| Minibar | Minibar |
| **Tax** | **Impuesto (EXCLUIR)** |
| NonRevenue | No-revenue |
| Others | Otros servicios |

---

### Proceso para Calcular Netos

#### Paso 1: Extraer Configuracion (una vez por hotel)

```
GET /fof/cfg/v1/transactionCodes?hotelIds=HOTEL1

Para cada transactionCode:
  - Si transactionType.code = "Tax" -> Marcar como IMPUESTO
  - Si transactionType.code != "Tax" -> Marcar como REVENUE
  - Guardar generates[].rule.percentage.amount como tasa_impuesto
```

#### Paso 2: Extraer Transacciones Diarias

```
GET /csh/v1/hotels/HOTEL1/financialPostings?startDate=2024-01-10&endDate=2024-01-14

Para cada posting:
  - Si transactionCode esta marcado como IMPUESTO -> IGNORAR
  - Si es REVENUE -> Agregar al total por fecha/outlet
```

#### Paso 3: Calculo Alternativo de Neto (si no filtras impuestos)

Si prefieres NO filtrar los transaction codes de impuestos y calcular el neto:

```
importe_bruto = postedAmount (incluye impuestos)
tasa_impuesto = porcentaje del generates del transactionCode

importe_neto = importe_bruto / (1 + tasa_impuesto/100)
```

Ejemplo:
- Posting de "Bar Beverage" = 110 EUR (bruto)
- IVA configurado = 10%
- Neto = 110 / 1.10 = 100 EUR

---

### Enfoque Alternativo: Por Reserva (Net/VAT separados)

Si necesitas precision absoluta por reserva:

**GET /csh/v1/hotels/{hotelId}/financialPostingsNetVat**

Devuelve para cada posting:
```json
{
  "posting": { ... },
  "postingBreakdown": {
    "grossAmount": { "amount": 110.00, "currencyCode": "EUR" },
    "netAmount": { "amount": 100.00, "currencyCode": "EUR" },
    "taxes": [
      {
        "amount": { "amount": 10.00, "currencyCode": "EUR" },
        "transactionCode": "9010"
      }
    ]
  }
}
```

**Limitacion:** Requiere `reservationId` - no util para extraccion masiva diaria.

## Proceso de Extraccion

### ID Unico para Upsert

Cada posting tiene un **`transactionNo`** unico que permite:
- Detectar registros nuevos (INSERT)
- Detectar registros modificados (UPDATE)
- Mantener registros existentes sin cambios

**Clave unica:** `{idhotel}-{transactionNo}`

---

### Paso 1: Configuracion de Transaction Codes (una vez por hotel)

```
Para cada hotel:
  1. GET /fof/cfg/v1/transactionCodes?hotelIds={hotelId}

  2. Para cada transactionCode en respuesta:
     - Guardar code, description, group, subgroup
     - Si classification.transactionType.code = "Tax":
         es_impuesto = TRUE
     - Si tiene generatesSetup.generates[]:
         tasa_impuesto = SUM(generates[].rule.percentage.amount)

  3. INSERT/UPDATE en tabla transaction_codes_config
```

---

### Paso 2: Carga Historica Inicial (una vez)

Para cargar datos historicos, iterar en bloques de 30 dias (limite del API):

```
Para cada hotel:
  fecha_inicio = fecha_apertura_hotel (o fecha deseada)
  fecha_fin = ayer

  Mientras fecha_inicio < fecha_fin:
    bloque_fin = MIN(fecha_inicio + 29 dias, fecha_fin)

    1. GET /csh/v1/hotels/{hotelId}/financialPostings
       ?startDate={fecha_inicio}&endDate={bloque_fin}
       &limit=50

    2. Iterar paginas mientras hasMore=true

    3. Para cada posting:
       - Usar transactionNo como ID unico
       - Calcular importe_neto
       - INSERT en tabla producciones_detalle

    fecha_inicio = bloque_fin + 1 dia
```

**Ejemplo para cargar 1 año:**
```bash
# Bloque 1: Enero
GET /csh/v1/hotels/HOTEL1/financialPostings?startDate=2024-01-01&endDate=2024-01-30

# Bloque 2: Febrero
GET /csh/v1/hotels/HOTEL1/financialPostings?startDate=2024-01-31&endDate=2024-02-29

# ... continuar hasta hoy
```

---

### Paso 3: Proceso Diario Incremental

Ejecutar cada dia para los ultimos 4-5 dias (capturar ajustes tardios):

```
Para cada hotel:
  1. GET /csh/v1/hotels/{hotelId}/financialPostings
     ?startDate={hoy-5}&endDate={hoy-1}
     &limit=50

  2. Iterar paginas mientras hasMore=true (incrementar offset)

  3. Para cada posting:
     a. Buscar en BD por idhotel + transactionNo
     b. Si NO existe -> INSERT
     c. Si existe y datos diferentes -> UPDATE
     d. Si existe e igual -> SKIP

     Para cada INSERT/UPDATE:
       - Buscar transactionCode en tabla transaction_codes_config
       - Si es_impuesto = TRUE -> marcar como impuesto
       - Calcular importe_neto = importe_bruto / (1 + tasa/100)

  4. Registros en BD con fecha en rango pero NO en respuesta API:
     -> Pueden haber sido eliminados/anulados
     -> Considerar marcar como "eliminado" o borrar
```

---

### Ejemplo de Llamadas

```bash
# Carga historica - bloque de 30 dias
GET /csh/v1/hotels/HOTEL1/financialPostings?startDate=2024-01-01&endDate=2024-01-30&limit=50&offset=0

# Proceso diario - ultimos 5 dias
GET /csh/v1/hotels/HOTEL1/financialPostings?startDate=2024-01-10&endDate=2024-01-14&limit=50&offset=0

# Paginacion si hasMore=true
GET /csh/v1/hotels/HOTEL1/financialPostings?startDate=2024-01-10&endDate=2024-01-14&limit=50&offset=50
```

## Estructura de Tablas Destino

### Tabla de Configuracion de Transaction Codes (extraer una vez)

```sql
CREATE TABLE transaction_codes_config (
    id SERIAL PRIMARY KEY,
    idhotel VARCHAR(20) NOT NULL,
    transaction_code VARCHAR(20) NOT NULL,
    description VARCHAR(200),
    transaction_type VARCHAR(20),     -- Lodging, FoodAndBeverage, Tax, etc.
    es_impuesto BOOLEAN DEFAULT FALSE,
    grupo VARCHAR(50),                -- F&B, Rooms, Tax, etc.
    subgrupo VARCHAR(50),
    tasa_impuesto DECIMAL(5,2),       -- % de impuesto que genera
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (idhotel, transaction_code)
);
```

### Tabla de Producciones Detalle (cada transaccion individual)

```sql
CREATE TABLE producciones_detalle (
    id SERIAL PRIMARY KEY,
    idhotel VARCHAR(20) NOT NULL,
    transaction_no BIGINT NOT NULL,        -- ID unico de Opera (para upsert)
    fecha DATE NOT NULL,                   -- revenueDate
    transaction_code VARCHAR(20) NOT NULL,
    descripcion VARCHAR(200),
    transaction_type VARCHAR(20),          -- Revenue, Payment, Wrapper
    es_impuesto BOOLEAN DEFAULT FALSE,
    importe_bruto DECIMAL(15,2),
    importe_neto DECIMAL(15,2),            -- Calculado
    moneda VARCHAR(3),
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    UNIQUE (idhotel, transaction_no)       -- Clave para upsert
);

-- Indices
CREATE INDEX idx_producciones_detalle_fecha
ON producciones_detalle(idhotel, fecha);

CREATE INDEX idx_producciones_detalle_outlet
ON producciones_detalle(idhotel, transaction_code, fecha);
```

### Vista de Producciones Agregadas (para reporting)

```sql
CREATE VIEW producciones_agregadas AS
SELECT
    pd.idhotel,
    pd.fecha,
    pd.transaction_code,
    tc.description AS outlet,
    tc.grupo AS agrupacion,
    SUM(pd.importe_bruto) AS importe_bruto_total,
    SUM(pd.importe_neto) AS importe_neto_total,
    pd.moneda,
    COUNT(*) AS num_transacciones
FROM producciones_detalle pd
JOIN transaction_codes_config tc
    ON pd.idhotel = tc.idhotel
    AND pd.transaction_code = tc.transaction_code
WHERE pd.es_impuesto = FALSE
GROUP BY
    pd.idhotel,
    pd.fecha,
    pd.transaction_code,
    tc.description,
    tc.grupo,
    pd.moneda;
```
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

## Endpoint de Configuracion de Transaction Codes

### GET /fof/cfg/v1/transactionCodes

Devuelve configuracion completa incluyendo impuestos y tasas.

**Parametros:**

| Parametro | Tipo | Requerido | Descripcion |
|-----------|------|-----------|-------------|
| hotelIds | query | Si | Codigos de hotel (array) |
| transactionGroupCodes | query | No | Filtrar por grupos |
| includeInactive | query | No | Incluir inactivos (default: false) |

**Ejemplo:**
```bash
GET /fof/cfg/v1/transactionCodes?hotelIds=HOTEL1&hotelIds=HOTEL2
```

**Recomendacion:** Extraer esta configuracion una vez y refrescar periodicamente (semanal/mensual) para capturar cambios en tasas impositivas.

## Notas Importantes

1. **revenueDate vs transactionDate**: Usar `revenueDate` que es la fecha efectiva del ingreso (puede diferir de la fecha de posting)

2. **Paginacion**: El endpoint tiene limite de 50 registros. Hoteles grandes pueden tener cientos de transacciones diarias.

3. **Transacciones negativas**: Pueden existir por anulaciones/ajustes. Incluirlas en la suma.

4. **Moneda**: Verificar que todos los postings esten en la moneda local del hotel o convertir si es necesario.

5. **Hora de ejecucion**: Ejecutar despues del cierre nocturno (night audit) para asegurar datos completos del dia anterior.

6. **Seguridad con 4-5 dias**: Algunos ajustes pueden postearse con fechas retroactivas. Procesar varios dias atras asegura capturar todo.
