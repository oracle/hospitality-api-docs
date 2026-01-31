# PERFILES DE HUÉSPED - Enriquecimiento de Reservas

## Objetivo
Obtener datos adicionales del huésped principal que no vienen en el Daily Summary:
- **Fecha de nacimiento** (birthDate)
- Género
- País de nacimiento
- Lugar de nacimiento
- VIP Status

---

## IMPORTANTE: Proceso Dependiente de RESERVAS

Este proceso **NO es independiente**. Depende de las reservas ya almacenadas en tu base de datos.

### Flujo Correcto

```
┌─────────────────────────────────────────────────────────────────────┐
│  PROCESO 1: RESERVAS (ver RESERVAS_API.md)                          │
│  - Se ejecuta primero (diariamente)                                 │
│  - Guarda reservas en BD con fecha_nacimiento = NULL                │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PROCESO 2: PERFILES (este documento)                               │
│  - Se ejecuta DESPUÉS (puede ser nocturno/batch)                    │
│  - Solo para reservas WHERE fecha_nacimiento IS NULL                │
│  - Actualiza reservas existentes con birthDate                      │
└─────────────────────────────────────────────────────────────────────┘
```

### Consulta para Obtener Reservas a Enriquecer

```sql
-- Reservas que necesitan enriquecimiento de perfil
SELECT DISTINCT idhotel, idreserva
FROM reservas
WHERE fecha_nacimiento IS NULL
  AND profile_id IS NULL
  AND estado NOT IN ('CANCELLED', 'NO SHOW')  -- Opcional: excluir canceladas
ORDER BY fecha_reserva DESC
LIMIT 1000;  -- Procesar en batches
```

---

## Flujo de Enriquecimiento por Reserva

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

## Proceso de Enriquecimiento (RECOMENDADO)

### Flujo Completo

```
┌─────────────────────────────────────────────────────────────────────┐
│  PASO 1: Proceso RESERVAS (diario)                                  │
│  - Guarda reservas en BD                                            │
│  - Campos fecha_nacimiento y profile_id quedan NULL                 │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│  PASO 2: Proceso PERFILES (batch, puede ser nocturno)               │
│                                                                     │
│  1. SELECT DISTINCT idhotel, idreserva                              │
│     FROM reservas                                                   │
│     WHERE fecha_nacimiento IS NULL                                  │
│     LIMIT 500  -- procesar en batches                               │
│                                                                     │
│  2. Para cada reserva sin fecha_nacimiento:                         │
│     a. GET /rsv/.../reservations/{id} → obtener profileId           │
│     b. GET /crm/v1/profiles/{profileId} → obtener birthDate         │
│     c. UPDATE reservas SET                                          │
│          fecha_nacimiento = birthDate,                              │
│          profile_id = profileId                                     │
│        WHERE idreserva = ?                                          │
└─────────────────────────────────────────────────────────────────────┘
```

### Código del Proceso Batch

```python
def proceso_enriquecimiento_perfiles(db, api_client, batch_size=500):
    """
    Proceso batch para enriquecer reservas con datos de perfil.
    Ejecutar después del proceso de RESERVAS (puede ser nocturno).
    """

    # 1. Obtener reservas sin fecha_nacimiento
    reservas_pendientes = db.query("""
        SELECT DISTINCT idhotel, idreserva
        FROM reservas
        WHERE fecha_nacimiento IS NULL
          AND estado NOT IN ('CANCELLED', 'NO SHOW')
        ORDER BY fecha_reserva DESC
        LIMIT ?
    """, batch_size)

    print(f"Reservas a enriquecer: {len(reservas_pendientes)}")

    for reserva in reservas_pendientes:
        hotel_id = reserva['idhotel']
        reservation_id = reserva['idreserva']

        try:
            # 2a. Obtener profileId de la reserva
            res_detail = api_client.get_reservation(hotel_id, reservation_id)
            profile_id = obtener_profile_id_principal(res_detail)

            if not profile_id:
                # Marcar como procesado sin perfil
                db.execute("""
                    UPDATE reservas
                    SET profile_id = 'NO_PROFILE'
                    WHERE idhotel = ? AND idreserva = ?
                """, (hotel_id, reservation_id))
                continue

            # 2b. Obtener datos del perfil
            perfil = api_client.get_profile(profile_id)
            customer = perfil.get('profile', {}).get('customer', {})
            birth_date = customer.get('birthDate')

            # 2c. Actualizar reservas
            db.execute("""
                UPDATE reservas
                SET fecha_nacimiento = ?,
                    profile_id = ?
                WHERE idhotel = ? AND idreserva = ?
            """, (birth_date, profile_id, hotel_id, reservation_id))

        except Exception as e:
            print(f"Error enriqueciendo {reservation_id}: {e}")
            continue

    db.commit()
```

### Ventajas de este Enfoque

| Ventaja | Descripción |
|---------|-------------|
| **No ralentiza RESERVAS** | El proceso principal no espera las 2 llamadas extra |
| **Eficiente** | Solo procesa reservas que no tienen fecha_nacimiento |
| **No repite trabajo** | Una vez enriquecida, no vuelve a procesarla |
| **Escalable** | Puede ejecutarse en paralelo o en batches |
| **Flexible** | Puede ejecutarse con menos frecuencia (nocturno) |

---

## Alternativa: Caché de Perfiles

Si un mismo huésped tiene múltiples reservas, puedes cachear sus datos:

```python
def obtener_datos_perfil_con_cache(profile_id, api_client, db):
    """Primero busca en caché, si no existe llama a la API"""

    # Buscar en caché
    cached = db.query(
        "SELECT * FROM profiles_cache WHERE profile_id = ?",
        profile_id
    )

    if cached:
        return cached

    # Si no está en caché, llamar a API
    perfil = api_client.get_profile(profile_id)
    customer = perfil.get('profile', {}).get('customer', {})

    # Guardar en caché
    db.execute("""
        INSERT INTO profiles_cache (profile_id, birth_date, gender)
        VALUES (?, ?, ?)
        ON CONFLICT (profile_id) DO UPDATE SET
            birth_date = EXCLUDED.birth_date,
            gender = EXCLUDED.gender
    """, (profile_id, customer.get('birthDate'), customer.get('gender')))

    return customer
```

**Ventaja:** Reduce llamadas a la API para huéspedes repetidos
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
