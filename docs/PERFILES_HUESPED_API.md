# PERFILES DE HUÉSPED - Enriquecimiento de Reservas

## Objetivo
Obtener datos adicionales del huésped principal que no vienen en el Daily Summary:
- **Fecha de nacimiento** (birthDate)
- Género
- País de nacimiento
- Lugar de nacimiento
- VIP Status

---

## Flujo de Enriquecimiento

El proceso requiere **2 llamadas adicionales** por reserva:

```
┌─────────────────────────────────────────────────────────────────────┐
│  1. Daily Summary (ya lo tienes)                                    │
│     → Devuelve: reservationId, pero NO profileId                    │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  2. GET /rsv/v1/hotels/{hotelId}/reservations/{reservationId}       │
│     → Devuelve: profileId del huésped principal                     │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  3. GET /crm/v1/profiles/{profileId}                                │
│     → Devuelve: birthDate, gender, birthCountry, vipStatus, etc.    │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Paso 1: Obtener profileId desde la Reserva

### Endpoint
```
GET /rsv/v1/hotels/{hotelId}/reservations/{reservationId}
```

### Parámetros Recomendados
Solo pedir lo necesario para minimizar el tamaño de respuesta:

```bash
GET /rsv/v1/hotels/4821/reservations/12345

# Headers
x-hotelid: 4821
x-app-key: {{appKey}}
Authorization: Bearer {{token}}
```

### Respuesta (extracto relevante)
```json
{
  "reservations": {
    "reservation": [{
      "reservationIdList": [
        { "id": "12345", "type": "Reservation" },
        { "id": "CONF123456", "type": "Confirmation" }
      ],
      "reservationGuests": [
        {
          "profileInfo": {
            "profileIdList": [
              { "id": "789012", "type": "Profile" }
            ]
          },
          "primary": true
        },
        {
          "profileInfo": {
            "profileIdList": [
              { "id": "789013", "type": "Profile" }
            ]
          },
          "primary": false
        }
      ]
    }]
  }
}
```

### Extraer profileId del huésped principal
```python
def obtener_profile_id_principal(reserva):
    """Obtiene el profileId del huésped principal (primary=true)"""
    for guest in reserva.get('reservationGuests', []):
        if guest.get('primary', False):
            profile_list = guest.get('profileInfo', {}).get('profileIdList', [])
            for profile in profile_list:
                if profile.get('type') == 'Profile':
                    return profile.get('id')
    return None
```

---

## Paso 2: Obtener Datos del Perfil

### Endpoint
```
GET /crm/v1/profiles/{profileId}
```

### Parámetros
```bash
GET /crm/v1/profiles/789012?fetchInstructions=Profile

# Headers
x-hotelid: 4821
x-app-key: {{appKey}}
Authorization: Bearer {{token}}
```

### Respuesta (extracto con datos del huésped)
```json
{
  "profiles": {
    "profileInfo": [{
      "profileIdList": [
        { "id": "789012", "type": "Profile" }
      ],
      "profile": {
        "customer": {
          "personName": [{
            "givenName": "Juan",
            "surname": "García",
            "nameTitle": "Mr",
            "nameType": "PRIMARY"
          }],
          "birthDate": "1985-03-15",
          "birthDateMasked": "****-**-15",
          "birthCountry": {
            "code": "ES",
            "name": "Spain"
          },
          "birthPlace": "Madrid",
          "gender": "MALE",
          "nationality": "ES",
          "nationalityDescription": "Spain",
          "language": "ES",
          "vipStatus": "GOLD",
          "vipDescription": "Gold Member",
          "profession": "Engineer"
        }
      }
    }]
  }
}
```

---

## Campos Disponibles del Perfil

### Datos Personales
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `birthDate` | date | **Fecha de nacimiento** (YYYY-MM-DD) |
| `birthDateMasked` | string | Fecha enmascarada por privacidad |
| `birthCountry.code` | string | Código ISO del país de nacimiento |
| `birthCountry.name` | string | Nombre del país de nacimiento |
| `birthPlace` | string | Ciudad/lugar de nacimiento |
| `gender` | string | Género: `MALE`, `FEMALE`, `UNKNOWN` |
| `nationality` | string | Código ISO de nacionalidad |
| `language` | string | Idioma preferido |
| `profession` | string | Profesión |

### Datos VIP/Fidelización
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `vipStatus` | string | Código de estado VIP |
| `vipDescription` | string | Descripción del estado VIP |
| `customerValue` | string | Valor del cliente |
| `creditRating` | string | Calificación crediticia |

### Nombre Completo
| Campo | Tipo | Descripción |
|-------|------|-------------|
| `personName[].givenName` | string | Nombre |
| `personName[].surname` | string | Apellido |
| `personName[].nameTitle` | string | Título (Mr, Mrs, Dr, etc.) |
| `personName[].middleName` | string | Segundo nombre |

---

## Mapeo a tu Base de Datos

### Tabla: `reservas` (campos adicionales)

| Campo BD | Campo API | Ubicación |
|----------|-----------|-----------|
| `fecha_nacimiento` | birthDate | `profile.customer.birthDate` |
| `genero` | gender | `profile.customer.gender` |
| `pais_nacimiento` | birthCountry.code | `profile.customer.birthCountry.code` |
| `ciudad_nacimiento` | birthPlace | `profile.customer.birthPlace` |
| `vip_status` | vipStatus | `profile.customer.vipStatus` |
| `nombre_huesped` | givenName + surname | `profile.customer.personName[0]` |
| `idioma` | language | `profile.customer.language` |
| `profesion` | profession | `profile.customer.profession` |

---

## Cálculo de Edad

```python
from datetime import date

def calcular_edad(birth_date_str, fecha_referencia=None):
    """
    Calcula la edad a partir de la fecha de nacimiento.

    Args:
        birth_date_str: Fecha en formato "YYYY-MM-DD"
        fecha_referencia: Fecha para calcular la edad (default: hoy)

    Returns:
        int: Edad en años
    """
    if not birth_date_str:
        return None

    birth_date = date.fromisoformat(birth_date_str)
    ref_date = fecha_referencia or date.today()

    edad = ref_date.year - birth_date.year

    # Ajustar si aún no ha cumplido años este año
    if (ref_date.month, ref_date.day) < (birth_date.month, birth_date.day):
        edad -= 1

    return edad

# Ejemplo
edad = calcular_edad("1985-03-15")  # → 40 (en 2026)
```

---

## Estrategia de Enriquecimiento Recomendada

### Opción A: Enriquecimiento en Tiempo Real (por reserva)

```python
def enriquecer_reserva(hotel_id, reservation_id, token):
    """Enriquece una reserva con datos del perfil del huésped"""

    # 1. Obtener reserva con profileId
    reserva = get_reservation(hotel_id, reservation_id, token)
    profile_id = obtener_profile_id_principal(reserva)

    if not profile_id:
        return None

    # 2. Obtener perfil
    perfil = get_profile(profile_id, token)

    # 3. Extraer datos
    customer = perfil.get('profile', {}).get('customer', {})

    return {
        'fecha_nacimiento': customer.get('birthDate'),
        'edad': calcular_edad(customer.get('birthDate')),
        'genero': customer.get('gender'),
        'pais_nacimiento': customer.get('birthCountry', {}).get('code'),
        'vip_status': customer.get('vipStatus'),
        'nombre': f"{customer.get('personName', [{}])[0].get('givenName', '')} {customer.get('personName', [{}])[0].get('surname', '')}"
    }
```

**Ventaja:** Datos siempre actualizados
**Desventaja:** 2 llamadas adicionales por reserva (lento para volumen alto)

### Opción B: Proceso Batch Separado (Recomendada)

```
PROCESO PRINCIPAL (Daily Summary)
│
├── 1. Obtener reservas modificadas ayer
├── 2. Guardar en BD con profileId = NULL
└── 3. Marcar para enriquecimiento posterior

PROCESO DE ENRIQUECIMIENTO (separado, puede ser nocturno)
│
├── 1. SELECT reservas WHERE fecha_nacimiento IS NULL
├── 2. Para cada reserva:
│   ├── GET reserva → obtener profileId
│   ├── GET perfil → obtener birthDate, etc.
│   └── UPDATE reserva con datos del perfil
└── 3. Puede ejecutarse en paralelo (múltiples threads)
```

**Ventaja:** No ralentiza el proceso principal
**Desventaja:** Datos del perfil disponibles con delay

### Opción C: Caché de Perfiles

```python
# Mantener una tabla de perfiles
# profiles: profile_id, birth_date, gender, last_updated

def obtener_datos_perfil_con_cache(profile_id, token):
    """Primero busca en caché, si no existe o está desactualizado, llama a la API"""

    # Buscar en caché
    cached = db.query("SELECT * FROM profiles WHERE profile_id = ?", profile_id)

    if cached and cached.last_updated > (today - 30 days):
        return cached

    # Si no está en caché o está desactualizado, llamar a API
    perfil = get_profile(profile_id, token)

    # Guardar en caché
    db.upsert("profiles", {
        'profile_id': profile_id,
        'birth_date': perfil.get('birthDate'),
        'gender': perfil.get('gender'),
        # ...
        'last_updated': today
    })

    return perfil
```

**Ventaja:** Reduce llamadas a la API (perfiles repetidos)
**Desventaja:** Requiere mantener tabla adicional

---

## Limitaciones y Consideraciones

### Rate Limiting
- Las APIs de Opera Cloud tienen límites de llamadas
- Implementar throttling si procesas muchas reservas
- Recomendación: máximo 10-20 llamadas/segundo

### Privacidad (GDPR)
- `birthDate` es dato personal sensible
- Considerar usar `birthDateMasked` si no necesitas la fecha exacta
- Implementar políticas de retención de datos

### Perfiles Compartidos
- Un perfil puede estar en múltiples reservas
- Si procesas varias reservas del mismo huésped, reutilizar el perfil

### Perfiles Sin Fecha de Nacimiento
- No todos los perfiles tienen `birthDate` informado
- Manejar valores NULL en tu lógica

---

## Ejemplo Completo con cURL

### 1. Obtener profileId desde reserva
```bash
curl -X GET \
  'https://{{host}}/rsv/v1/hotels/4821/reservations/12345' \
  -H 'x-hotelid: 4821' \
  -H 'x-app-key: {{appKey}}' \
  -H 'Authorization: Bearer {{token}}'
```

### 2. Obtener perfil con datos personales
```bash
curl -X GET \
  'https://{{host}}/crm/v1/profiles/789012?fetchInstructions=Profile' \
  -H 'x-hotelid: 4821' \
  -H 'x-app-key: {{appKey}}' \
  -H 'Authorization: Bearer {{token}}'
```

---

## Integración con el Proceso de Reservas

### Modificar la tabla de reservas
```sql
ALTER TABLE reservas ADD COLUMN profile_id VARCHAR(20);
ALTER TABLE reservas ADD COLUMN fecha_nacimiento DATE;
ALTER TABLE reservas ADD COLUMN edad INT;
ALTER TABLE reservas ADD COLUMN genero VARCHAR(10);
ALTER TABLE reservas ADD COLUMN pais_nacimiento VARCHAR(3);
ALTER TABLE reservas ADD COLUMN vip_status VARCHAR(20);
ALTER TABLE reservas ADD COLUMN nombre_huesped VARCHAR(200);
ALTER TABLE reservas ADD COLUMN perfil_enriquecido BOOLEAN DEFAULT FALSE;
ALTER TABLE reservas ADD COLUMN fecha_enriquecimiento TIMESTAMP;
```

### Proceso incremental modificado
```
1. Obtener reservas modificadas ayer (Daily Summary)
2. Transformar y guardar en BD (perfil_enriquecido = FALSE)
3. [NUEVO] Proceso de enriquecimiento:
   a. Para cada reserva con perfil_enriquecido = FALSE
   b. Obtener profileId
   c. Obtener perfil del CRM
   d. Actualizar reserva con datos del perfil
   e. Marcar perfil_enriquecido = TRUE
```
