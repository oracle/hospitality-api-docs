# HOTELES - Especificación API Opera Cloud

## Objetivo
Obtener la lista de hoteles asociados a una cuenta/cadena para poder iterar sobre ellos en los procesos de extracción de datos.

---

## Cuándo Usar Este Endpoint

Este endpoint debe ser el **primer paso después de autenticarse**, especialmente si:
- Tienes múltiples hoteles en tu cuenta
- No conoces los hotelId exactos
- Necesitas verificar qué hoteles están activos

```
┌─────────────────────────────────────────────────────────────────────┐
│  FLUJO DE EXTRACCIÓN DE DATOS                                       │
│                                                                      │
│  1. AUTENTICACIÓN → Obtener token                                   │
│  2. HOTELES → Obtener lista de hotelId ← (ESTE DOCUMENTO)          │
│  3. Para CADA hotelId:                                              │
│     - DISPONIBILIDAD                                                │
│     - RESERVAS                                                      │
│     - GRUPOS                                                        │
│     - PRODUCCIONES                                                  │
│     - PERFILES (dependiente de RESERVAS)                           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Endpoint Principal

```
GET /ent/config/v1/hotels
```

**Base URL:** `https://{environment}.oraclecloud.com/ent/config/v1`

---

## Parámetros de la Llamada

### Query Parameters (Todos Opcionales)
| Parámetro | Tipo | Descripción |
|-----------|------|-------------|
| `hotelId` | string | Filtrar por ID específico de hotel |
| `name` | string | Buscar por nombre del hotel |
| `countryCode` | string | Filtrar por código de país (ej: "ES", "MX", "US") |
| `marketingRegionCode` | string | Filtrar por región de marketing |
| `marketingCity` | string | Filtrar por ciudad de marketing |
| `propertyTypeCode` | string[] | Filtrar por tipo de propiedad |

### Headers Requeridos
| Header | Descripción |
|--------|-------------|
| `x-app-key` | API Key de la aplicación |
| `Authorization` | Bearer token OAuth2 |
| `Content-Type` | `application/json` |

**Nota:** Este endpoint NO requiere `x-hotelid` ya que es a nivel de cadena/cuenta.

---

## Ejemplo de Llamada

### Obtener Todos los Hoteles de la Cuenta
```bash
curl -X GET \
  'https://{{host}}/ent/config/v1/hotels' \
  -H 'x-app-key: {{appKey}}' \
  -H 'Authorization: Bearer {{token}}' \
  -H 'Content-Type: application/json'
```

### Filtrar por País
```bash
curl -X GET \
  'https://{{host}}/ent/config/v1/hotels?countryCode=ES' \
  -H 'x-app-key: {{appKey}}' \
  -H 'Authorization: Bearer {{token}}' \
  -H 'Content-Type: application/json'
```

---

## Estructura de la Respuesta

```json
{
  "hotelSummaryInfoList": [
    {
      "hotelId": "HOTEL1",
      "hotelName": "Gran Hotel Madrid Centro",
      "chainCode": "MYCHAIN",
      "brandCode": "LUXURY",
      "propertyType": "Full Service Hotel",
      "activeDate": "2020-01-01",
      "inactiveDate": null
    },
    {
      "hotelId": "HOTEL2",
      "hotelName": "Hotel Barcelona Playa",
      "chainCode": "MYCHAIN",
      "brandCode": "RESORT",
      "propertyType": "Resort",
      "activeDate": "2019-06-15",
      "inactiveDate": null
    },
    {
      "hotelId": "4821",
      "hotelName": "Hotel Valencia Puerto",
      "chainCode": "MYCHAIN",
      "brandCode": "BUSINESS",
      "propertyType": "Business Hotel",
      "activeDate": "2021-03-01",
      "inactiveDate": null
    }
  ],
  "links": [...],
  "warnings": [...]
}
```

### Campos de la Respuesta

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `hotelId` | string | **ID único del hotel** - usar en todas las llamadas posteriores |
| `hotelName` | string | Nombre descriptivo del hotel |
| `chainCode` | string | Código de la cadena a la que pertenece |
| `brandCode` | string | Código de la marca del hotel |
| `propertyType` | string | Tipo de propiedad (Hotel, Resort, etc.) |
| `activeDate` | date | Fecha desde la cual el hotel está activo |
| `inactiveDate` | date | Fecha de inactivación (null si está activo) |

---

## Mapeo a tu Base de Datos

### Tabla: `hoteles`

| Campo BD | Campo API | Descripción |
|----------|-----------|-------------|
| `hotel_id` | hotelId | ID único (PK) |
| `nombre` | hotelName | Nombre del hotel |
| `cadena` | chainCode | Código de cadena |
| `marca` | brandCode | Código de marca |
| `tipo` | propertyType | Tipo de propiedad |
| `fecha_alta` | activeDate | Fecha de activación |
| `fecha_baja` | inactiveDate | Fecha de baja (nullable) |
| `activo` | (calculado) | true si inactiveDate es null o > hoy |

### SQL de Creación

```sql
CREATE TABLE hoteles (
    hotel_id VARCHAR(20) PRIMARY KEY,
    nombre VARCHAR(80),
    cadena VARCHAR(20),
    marca VARCHAR(20),
    tipo VARCHAR(100),
    fecha_alta DATE,
    fecha_baja DATE,
    activo BOOLEAN DEFAULT true,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## Pseudocódigo de Transformación

```python
def transformar_hoteles(response):
    """
    Transforma la respuesta de la API a registros para la BD.
    """
    registros = []

    for hotel in response.get('hotelSummaryInfoList', []):
        # Calcular si está activo
        inactive_date = hotel.get('inactiveDate')
        activo = inactive_date is None or inactive_date > datetime.now().date()

        registro = {
            'hotel_id': hotel['hotelId'],
            'nombre': hotel.get('hotelName'),
            'cadena': hotel.get('chainCode'),
            'marca': hotel.get('brandCode'),
            'tipo': hotel.get('propertyType'),
            'fecha_alta': hotel.get('activeDate'),
            'fecha_baja': hotel.get('inactiveDate'),
            'activo': activo
        }
        registros.append(registro)

    return registros

def obtener_hoteles_activos(response):
    """
    Devuelve solo los hotelId de hoteles activos para usar en otros procesos.
    """
    hoteles = transformar_hoteles(response)
    return [h['hotel_id'] for h in hoteles if h['activo']]
```

---

## Lógica de Carga

### Proceso de Sincronización (Diario o Semanal)

```python
def sincronizar_hoteles(client):
    """
    Sincroniza la lista de hoteles. Ejecutar diariamente o semanalmente.
    """
    # 1. Obtener hoteles de la API
    response = client.get('/ent/config/v1/hotels')
    hoteles = transformar_hoteles(response)

    # 2. Upsert en la base de datos
    for hotel in hoteles:
        db.execute("""
            INSERT INTO hoteles (hotel_id, nombre, cadena, marca, tipo,
                                 fecha_alta, fecha_baja, activo, fecha_actualizacion)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT (hotel_id) DO UPDATE SET
                nombre = EXCLUDED.nombre,
                cadena = EXCLUDED.cadena,
                marca = EXCLUDED.marca,
                tipo = EXCLUDED.tipo,
                fecha_alta = EXCLUDED.fecha_alta,
                fecha_baja = EXCLUDED.fecha_baja,
                activo = EXCLUDED.activo,
                fecha_actualizacion = CURRENT_TIMESTAMP
        """, (
            hotel['hotel_id'],
            hotel['nombre'],
            hotel['cadena'],
            hotel['marca'],
            hotel['tipo'],
            hotel['fecha_alta'],
            hotel['fecha_baja'],
            hotel['activo']
        ))

    return hoteles
```

---

## Integración con Otros Procesos

### Orquestador Principal

```python
def proceso_extraccion_diario():
    """
    Proceso principal que ejecuta todas las extracciones.
    """
    # 1. AUTENTICACIÓN
    client = OperaCloudClient(config)
    client.authenticate()

    # 2. OBTENER HOTELES
    response = client.get('/ent/config/v1/hotels')
    hotel_ids = obtener_hoteles_activos(response)

    print(f"Hoteles a procesar: {len(hotel_ids)}")
    # Ejemplo: ['HOTEL1', 'HOTEL2', '4821']

    # 3. PARA CADA HOTEL, EJECUTAR EXTRACCIONES
    for hotel_id in hotel_ids:
        print(f"\n--- Procesando hotel: {hotel_id} ---")

        # 3.1 DISPONIBILIDAD
        extraer_disponibilidad(client, hotel_id)

        # 3.2 RESERVAS
        extraer_reservas(client, hotel_id)

        # 3.3 GRUPOS
        extraer_grupos(client, hotel_id)

        # 3.4 PRODUCCIONES
        extraer_producciones(client, hotel_id)

        # 3.5 PERFILES (dependiente de reservas)
        enriquecer_perfiles(client, hotel_id)

    print("\n=== Extracción completada ===")
```

### Ejecución en Paralelo (Opcional)

```python
from concurrent.futures import ThreadPoolExecutor

def proceso_extraccion_paralelo():
    """
    Versión paralelizada para procesar múltiples hoteles simultáneamente.
    """
    client = OperaCloudClient(config)
    client.authenticate()

    response = client.get('/ent/config/v1/hotels')
    hotel_ids = obtener_hoteles_activos(response)

    def procesar_hotel(hotel_id):
        try:
            extraer_disponibilidad(client, hotel_id)
            extraer_reservas(client, hotel_id)
            extraer_grupos(client, hotel_id)
            extraer_producciones(client, hotel_id)
            enriquecer_perfiles(client, hotel_id)
            return f"{hotel_id}: OK"
        except Exception as e:
            return f"{hotel_id}: ERROR - {str(e)}"

    # Procesar hasta 3 hoteles en paralelo
    with ThreadPoolExecutor(max_workers=3) as executor:
        resultados = list(executor.map(procesar_hotel, hotel_ids))

    for resultado in resultados:
        print(resultado)
```

---

## Códigos de Respuesta HTTP

| Código | Descripción |
|--------|-------------|
| 200 | OK - Lista de hoteles devuelta correctamente |
| 204 | No Content - No se encontraron hoteles |
| 400 | Bad Request - Parámetros inválidos |
| 401 | Unauthorized - Token inválido |
| 403 | Forbidden - Sin permisos para ver hoteles |

---

## Notas Importantes

1. **Frecuencia de llamada**: Este endpoint no cambia frecuentemente. Llamar una vez al día o incluso una vez por semana es suficiente.

2. **Hoteles inactivos**: Filtra los hoteles con `inactiveDate` en el pasado para no procesar propiedades cerradas.

3. **Cache de hotel_ids**: Puedes cachear la lista de hotel_ids en memoria o archivo para no llamar este endpoint en cada ejecución.

4. **Rate limiting**: Al ser un endpoint de configuración, tiene límites más permisivos, pero evita llamarlo repetidamente.

5. **Orden de ejecución**: Siempre ejecutar DESPUÉS de autenticación y ANTES de cualquier otro proceso de extracción.

---

## Ejemplo Completo de Cliente

```python
import requests
import base64
import time

class OperaCloudClient:
    def __init__(self, config):
        self.host = config["host"]
        self.client_id = config["client_id"]
        self.client_secret = config["client_secret"]
        self.app_key = config["app_key"]
        self.username = config["username"]
        self.password = config["password"]
        self.token = None
        self.token_expiry = 0
        self.hotel_ids = []  # Cache de hoteles

    def authenticate(self):
        """Obtiene o renueva el token de acceso"""
        if self.token and time.time() < (self.token_expiry - 300):
            return self.token

        credentials = f"{self.client_id}:{self.client_secret}"
        credentials_b64 = base64.b64encode(credentials.encode()).decode()

        response = requests.post(
            f"{self.host}/oauth/v1/tokens",
            headers={
                "Authorization": f"Basic {credentials_b64}",
                "x-app-key": self.app_key,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            data={
                "grant_type": "password",
                "username": self.username,
                "password": self.password
            }
        )

        if response.status_code != 200:
            raise Exception(f"Auth failed: {response.status_code} - {response.text}")

        data = response.json()
        self.token = data["access_token"]
        self.token_expiry = time.time() + data.get("expires_in", 3600)
        return self.token

    def get_hoteles(self, solo_activos=True):
        """Obtiene la lista de hoteles"""
        response = requests.get(
            f"{self.host}/ent/config/v1/hotels",
            headers={
                "Authorization": f"Bearer {self.authenticate()}",
                "x-app-key": self.app_key,
                "Content-Type": "application/json"
            }
        )

        if response.status_code == 204:
            return []

        if response.status_code != 200:
            raise Exception(f"Error obteniendo hoteles: {response.status_code}")

        data = response.json()
        hoteles = data.get('hotelSummaryInfoList', [])

        if solo_activos:
            from datetime import datetime
            hoy = datetime.now().date().isoformat()
            hoteles = [
                h for h in hoteles
                if h.get('inactiveDate') is None or h['inactiveDate'] > hoy
            ]

        # Cachear los IDs
        self.hotel_ids = [h['hotelId'] for h in hoteles]

        return hoteles

    def get_hotel_ids(self):
        """Devuelve lista de hotel IDs (usa cache si existe)"""
        if not self.hotel_ids:
            self.get_hoteles()
        return self.hotel_ids


# Uso
config = {
    "host": "https://tenant.hospitality-api.region.ocs.oraclecloud.com",
    "client_id": "your_client_id",
    "client_secret": "your_client_secret",
    "app_key": "41ecd082-8997-4c69-af34-2f72b83645ff",
    "username": "integration_user",
    "password": "integration_password"
}

client = OperaCloudClient(config)

# Obtener hoteles
hoteles = client.get_hoteles()
print(f"Total hoteles activos: {len(hoteles)}")
for h in hoteles:
    print(f"  - {h['hotelId']}: {h['hotelName']}")

# Usar en procesos
for hotel_id in client.get_hotel_ids():
    print(f"\nProcesando {hotel_id}...")
    # Aquí van las llamadas a disponibilidad, reservas, etc.
```
