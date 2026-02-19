# AUTENTICACIÓN - Opera Cloud API

## Objetivo
Documentar el proceso de autenticación OAuth2 necesario antes de realizar cualquier llamada a las APIs de Opera Cloud.

---

## Requisitos Previos

Antes de poder autenticarte, necesitas obtener las siguientes credenciales de Oracle:

| Credencial | Descripción | Cómo obtenerla |
|------------|-------------|----------------|
| **Client ID** | Identificador único de tu aplicación | Portal de Oracle Hospitality |
| **Client Secret** | Clave secreta de tu aplicación | Portal de Oracle Hospitality |
| **Application Key (x-app-key)** | UUID de tu aplicación registrada | Portal de Oracle Hospitality |
| **Username** | Usuario de integración OPERA Cloud | Configurado en OPERA Cloud |
| **Password** | Contraseña del usuario de integración | Configurado en OPERA Cloud |
| **Environment URL** | URL del entorno (sandbox/producción) | Proporcionado por Oracle |

### URLs de Entorno

| Entorno | URL Base |
|---------|----------|
| Sandbox/Test | `https://{tenant}.hospitality-api.us-ashburn-1.ocs.oraclecloud.com` |
| Producción | `https://{tenant}.hospitality-api.{region}.ocs.oraclecloud.com` |

---

## Endpoint de Autenticación

```
POST /oauth/v1/tokens
```

**Base URL:** `https://{environment}/oauth/v1`

---

## Flujo de Autenticación

### Paso 1: Preparar las Credenciales

```python
import base64

client_id = "tu_client_id"
client_secret = "tu_client_secret"

# Crear el header de Basic Auth
credentials = f"{client_id}:{client_secret}"
credentials_b64 = base64.b64encode(credentials.encode()).decode()

# Resultado: "dHVfY2xpZW50X2lkOnR1X2NsaWVudF9zZWNyZXQ="
```

### Paso 2: Solicitar el Token

#### Opción A: Grant Type "password" (Recomendado para integraciones)

```bash
curl -X POST \
  'https://{{host}}/oauth/v1/tokens' \
  -H 'Authorization: Basic {{credentials_b64}}' \
  -H 'x-app-key: {{app_key}}' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'grant_type=password&username={{username}}&password={{password}}'
```

#### Opción B: Grant Type "client_credentials"

```bash
curl -X POST \
  'https://{{host}}/oauth/v1/tokens' \
  -H 'Authorization: Basic {{credentials_b64}}' \
  -H 'x-app-key: {{app_key}}' \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  -d 'grant_type=client_credentials&scope={{assigned_scope}}'
```

### Paso 3: Recibir el Token

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsIng1dCI6...",
  "expires_in": 3600,
  "token_type": "Bearer",
  "oracle_tk_context": "user_assertion"
}
```

| Campo | Descripción |
|-------|-------------|
| `access_token` | **Token JWT** para usar en todas las llamadas |
| `expires_in` | Tiempo de expiración en segundos (típicamente 3600 = 1 hora) |
| `token_type` | Siempre "Bearer" |

---

## Usar el Token en las Llamadas

Una vez obtenido el token, inclúyelo en **TODAS** las llamadas a las APIs:

```bash
curl -X GET \
  'https://{{host}}/inv/v1/hotels/4821/inventoryStatistics?...' \
  -H 'Authorization: Bearer {{access_token}}' \
  -H 'x-app-key: {{app_key}}' \
  -H 'x-hotelid: 4821' \
  -H 'Content-Type: application/json'
```

### Headers Requeridos en Cada Llamada

| Header | Valor | Descripción |
|--------|-------|-------------|
| `Authorization` | `Bearer {access_token}` | Token obtenido en autenticación |
| `x-app-key` | `{app_key}` | Application Key (UUID) |
| `x-hotelid` | `{hotel_id}` | ID del hotel (para APIs de property) |
| `Content-Type` | `application/json` | Tipo de contenido |

---

## Gestión del Token

### Renovación del Token

El token expira típicamente en **1 hora (3600 segundos)**. Implementa renovación automática:

```python
import time
import requests

class OperaCloudAuth:
    def __init__(self, host, client_id, client_secret, app_key, username, password):
        self.host = host
        self.client_id = client_id
        self.client_secret = client_secret
        self.app_key = app_key
        self.username = username
        self.password = password
        self.token = None
        self.token_expiry = 0

    def get_token(self):
        """Obtiene un token válido, renovando si es necesario"""
        # Renovar 5 minutos antes de expirar
        if self.token and time.time() < (self.token_expiry - 300):
            return self.token

        return self._request_new_token()

    def _request_new_token(self):
        """Solicita un nuevo token a la API"""
        import base64

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

        if response.status_code == 200:
            data = response.json()
            self.token = data["access_token"]
            self.token_expiry = time.time() + data.get("expires_in", 3600)
            return self.token
        else:
            raise Exception(f"Error de autenticación: {response.status_code} - {response.text}")

# Uso
auth = OperaCloudAuth(
    host="https://tenant.hospitality-api.region.ocs.oraclecloud.com",
    client_id="tu_client_id",
    client_secret="tu_client_secret",
    app_key="41ecd082-8997-4c69-af34-2f72b83645ff",
    username="integration_user",
    password="integration_password"
)

token = auth.get_token()
```

---

## Errores Comunes de Autenticación

| Código | Error | Causa | Solución |
|--------|-------|-------|----------|
| 400 | Bad Request | Parámetros inválidos | Verificar grant_type y formato |
| 401 | Unauthorized | Credenciales inválidas | Verificar client_id, client_secret, username, password |
| 403 | Forbidden | Sin permisos | Verificar scope y permisos del usuario |

### Ejemplo de Error 401
```json
{
  "error": "invalid_client",
  "error_description": "Client authentication failed"
}
```

**Causas posibles:**
- Client ID o Client Secret incorrectos
- Credenciales Base64 mal codificadas
- Application Key inválida

---

## Seguridad: Mejores Prácticas

### 1. Almacenamiento de Credenciales

```python
# MAL - No hardcodear credenciales
client_secret = "abc123secret"

# BIEN - Usar variables de entorno
import os
client_secret = os.environ.get("OPERA_CLIENT_SECRET")

# MEJOR - Usar un gestor de secretos
from azure.keyvault.secrets import SecretClient
client_secret = secret_client.get_secret("opera-client-secret").value
```

### 2. No Loguear Tokens

```python
# MAL
print(f"Token obtenido: {token}")

# BIEN
print(f"Token obtenido: {token[:20]}...")
```

### 3. Usar HTTPS Siempre

Todas las llamadas deben ser por HTTPS. Las APIs de Oracle no aceptan HTTP.

### 4. Rotar Credenciales

- Cambiar Client Secret periódicamente
- Cambiar contraseña del usuario de integración regularmente
- No compartir credenciales entre entornos (sandbox/producción)

---

## Configuración Inicial en Opera Cloud

### Crear Usuario de Integración

1. Acceder a OPERA Cloud Administration
2. Ir a **Enterprise** → **Application Settings** → **Integration Users**
3. Crear nuevo usuario:
   - Username: `integration_api`
   - Asignar roles necesarios:
     - `RESERVATION_READ`
     - `INVENTORY_READ`
     - `CASHIERING_READ`
     - `BLOCK_READ`
     - `PROFILE_READ`

### Registrar Aplicación

1. Acceder al **Oracle Hospitality Developer Portal**
2. Crear nueva aplicación
3. Obtener:
   - Client ID
   - Client Secret
   - Application Key (x-app-key)
4. Configurar URLs de callback (si aplica)
5. Seleccionar APIs a las que tendrá acceso

---

## Flujo Completo de Ejemplo

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

    def _get_auth_header(self):
        """Genera el header Basic Auth"""
        credentials = f"{self.client_id}:{self.client_secret}"
        return base64.b64encode(credentials.encode()).decode()

    def authenticate(self):
        """Obtiene o renueva el token de acceso"""
        if self.token and time.time() < (self.token_expiry - 300):
            return self.token

        response = requests.post(
            f"{self.host}/oauth/v1/tokens",
            headers={
                "Authorization": f"Basic {self._get_auth_header()}",
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

    def _get_headers(self, hotel_id=None):
        """Genera los headers para las llamadas a la API"""
        headers = {
            "Authorization": f"Bearer {self.authenticate()}",
            "x-app-key": self.app_key,
            "Content-Type": "application/json"
        }
        if hotel_id:
            headers["x-hotelid"] = hotel_id
        return headers

    def get_inventory(self, hotel_id, start_date, end_date):
        """Ejemplo: Obtener disponibilidad"""
        response = requests.get(
            f"{self.host}/inv/v1/hotels/{hotel_id}/inventoryStatistics",
            headers=self._get_headers(hotel_id),
            params={
                "dateRangeStart": start_date,
                "dateRangeEnd": end_date,
                "reportCode": "RoomsAvailabilitySummary",
                "parameterName": ["RoomPhysicalRoomsYN", "RoomOOOYN", "RoomAvailRoomsYN"],
                "parameterValue": ["Y", "Y", "Y"]
            }
        )
        return response.json()

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

# Primera llamada - autentica automáticamente
inventory = client.get_inventory("HOTEL1", "2026-01-01", "2026-01-31")

# Siguientes llamadas - reutiliza el token
reservations = client.get_reservations("HOTEL1", "2026-01-01")
```

---

## Resumen del Proceso

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. OBTENER CREDENCIALES                                            │
│     - Client ID + Client Secret (de Oracle Developer Portal)        │
│     - Application Key (x-app-key)                                   │
│     - Username + Password (usuario de integración en OPERA)         │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. SOLICITAR TOKEN                                                 │
│     POST /oauth/v1/tokens                                           │
│     - Header: Basic Auth (client_id:client_secret en base64)        │
│     - Header: x-app-key                                             │
│     - Body: grant_type=password, username, password                 │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. RECIBIR TOKEN JWT                                               │
│     {                                                               │
│       "access_token": "eyJhbG...",                                  │
│       "expires_in": 3600,                                           │
│       "token_type": "Bearer"                                        │
│     }                                                               │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  4. USAR TOKEN EN CADA LLAMADA                                      │
│     - Header: Authorization: Bearer {access_token}                  │
│     - Header: x-app-key                                             │
│     - Header: x-hotelid (para APIs de property)                     │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  5. RENOVAR TOKEN ANTES DE EXPIRAR                                  │
│     - Expira en ~1 hora                                             │
│     - Renovar 5 minutos antes                                       │
│     - Repetir paso 2                                                │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Notas Importantes

1. **El token es JWT**: Puedes decodificarlo para ver información como fecha de expiración, pero NO lo modifiques.

2. **Un token por sesión**: No necesitas un token por hotel. El mismo token sirve para todos los hoteles a los que tenga acceso el usuario.

3. **Rate limiting**: Oracle aplica límites de llamadas. Si recibes 429 (Too Many Requests), implementa backoff exponencial.

4. **Entorno de pruebas**: Usa siempre el sandbox para desarrollo antes de ir a producción.

5. **Logs de auditoría**: Oracle registra todas las llamadas. Usa el header `x-request-id` para correlacionar tus logs con los de Oracle.
