# Chatbot Local con n8n + Ollama (Llama 3) + PostgreSQL

## Arquitectura General

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│      n8n         │     │     Ollama        │     │   PostgreSQL     │
│  (Automatizacion │────▶│  (Modelo LLM      │     │  (Base de datos) │
│   de workflows)  │     │   Llama 3)        │     │                  │
│  Puerto: 5678    │     │  Puerto: 11434    │     │  Puerto: 5432    │
└────────┬─────────┘     └──────────────────┘     └────────┬─────────┘
         │                                                  │
         └──────────────────────────────────────────────────┘
              n8n usa Postgres para su estado interno
              + tablas custom para usuarios, sesiones,
                conversaciones y mensajes
```

**Que hace cada pieza:**
- **n8n**: plataforma de automatizacion donde esta el flujo del chatbot.
- **Ollama**: servidor local de modelos de IA. Corre Llama 3 sin enviar datos fuera.
- **PostgreSQL**: base de datos para usuarios, sesiones, conversaciones, mensajes y estado de n8n.

**Que se automatiza con `docker compose up -d`:**
- PostgreSQL arranca y crea las 4 tablas automaticamente (solo la primera vez)
- Ollama arranca y descarga Llama 3 si no lo tiene ya
- n8n arranca conectado a Postgres
- El workflow del chatbot se importa automaticamente en n8n (solo la primera vez)

**Lo unico manual (una sola vez):**
- Crear tu cuenta de admin en n8n
- Crear la credencial de Postgres en n8n y vincularla al workflow
- Activar el workflow

**Base de datos - 4 tablas:**
```
chatbot_users              Usuarios (nombre, email, activo/inactivo)
    │
    ├── chatbot_sessions       Login/logout (cuando entran y salen)
    │
    └── chatbot_conversations  Hilos de chat (titulo, soft-delete)
            │
            └── chatbot_messages   Mensajes (role, contenido, tokens)
```

**System prompt**: global, definido en el workflow de n8n (nodo "Construir Prompt"). Aplica a todos los usuarios igual.

---

## PASO 0 - Prerequisitos ✅

### 0.1 - Instalar Docker Desktop

1. Descarga de: https://www.docker.com/products/docker-desktop/
2. En Windows: asegurate de tener WSL2 habilitado

### 0.2 - Verificar

```powershell
docker --version
docker compose version
```

### 0.3 - (Solo GPU NVIDIA) Instalar NVIDIA Container Toolkit

```powershell
nvidia-smi
```
Si ves info de tu GPU, instala el toolkit: https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html

---

## PASO 1 - Crear la estructura del proyecto ✅

```powershell
mkdir db\init
mkdir workflows
```

Estructura final:

```
n8n-ollama-chatbot/
├── .env                              # Variables de entorno (NO se sube a Git)
├── .env.example                      # Plantilla del .env (se sube a Git)
├── .gitignore                        # Excluye .env de Git
├── docker-compose.yml                # Servicios (CPU)
├── docker-compose.gpu.yml            # Override GPU NVIDIA
├── db/
│   └── init/
│       └── 01-init.sql               # 4 tablas SQL (auto-ejecuta al arrancar)
├── workflows/
│   └── chatbot-workflow.json         # Workflow n8n (auto-importa al arrancar)
└── GUIA.md
```

---

## PASO 2 - Configurar variables de entorno (.env) ✅

Existe tambien `.env.example` como plantilla para compartir sin exponer credenciales.

```env
# ===========================
# PostgreSQL
# ===========================
POSTGRES_USER=n8n_user
POSTGRES_PASSWORD=CAMBIAME
POSTGRES_DB=n8n_db

# ===========================
# n8n
# ===========================
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=CAMBIAME
N8N_HOST=localhost
N8N_PORT=5678
N8N_PROTOCOL=http
N8N_ENCRYPTION_KEY=CAMBIAME

# ===========================
# Ollama
# ===========================
OLLAMA_HOST=0.0.0.0
```

**IMPORTANTE**: Cambia los 3 `CAMBIAME` por valores propios.

---

## PASO 3 - Crear docker-compose.yml ✅

4 servicios:
- `postgres` - base de datos con healthcheck
- `ollama` - servidor LLM, **auto-descarga Llama 3** si no lo tiene
- `n8n` - plataforma de workflows con healthcheck
- `n8n-init` - contenedor temporal que **auto-importa el workflow** y se apaga (usa flag file para no repetir)

Ver archivo `docker-compose.yml` para el contenido completo.

---

## PASO 4 - Crear docker-compose.gpu.yml ✅

Override para GPU NVIDIA. Solo afecta a Ollama. Se usa asi:

```powershell
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d
```

No funciona solo, se aplica **encima** del docker-compose.yml principal.

---

## PASO 5 - Crear el script SQL (db/init/01-init.sql) ✅

PostgreSQL ejecuta este script automaticamente la primera vez que arranca. Crea 4 tablas:

```sql
-- 1. USUARIOS
CREATE TABLE chatbot_users (
    id, external_id, name, email, is_active, created_at, updated_at
);

-- 2. SESIONES (login/logout)
CREATE TABLE chatbot_sessions (
    id, user_id (FK), logged_in_at, logged_out_at, is_active
);

-- 3. CONVERSACIONES (hilos de chat, con soft-delete)
CREATE TABLE chatbot_conversations (
    id, user_id (FK), title, is_deleted, created_at, updated_at, deleted_at
);

-- 4. MENSAJES
CREATE TABLE chatbot_messages (
    id, conversation_id (FK), role, content, tokens_used, created_at
);
```

Incluye un usuario de prueba: `user-001` / "Usuario de Prueba".

Ver archivo `db/init/01-init.sql` para el SQL completo.

---

## PASO 6 - Crear el workflow JSON (workflows/chatbot-workflow.json) ✅

Workflow de n8n con 9 nodos, se importa automaticamente al arrancar:

```
Webhook POST /chat
    → Buscar Usuario
    → Obtener/Crear Conversacion
    → Cargar Historial
    → Construir Prompt (system prompt global aqui)
    → Llamar Ollama
    → Preparar Guardado
    → Guardar Mensajes (user + assistant)
    → Responder
```

- Si mandas `conversation_id` existente → continua ese hilo
- Si no mandas `conversation_id` → crea una conversacion nueva
- Los mensajes se escapan para evitar SQL injection
- El system prompt se define en el nodo "Construir Prompt"

Ver archivo `workflows/chatbot-workflow.json` para el JSON completo.

---

## PASO 7 - Levantar todo

### CPU:
```powershell
docker compose up -d
```

### GPU NVIDIA:
```powershell
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d
```

### Verificar:
```powershell
docker compose ps
```

Deberias ver:
- `chatbot-postgres` → Up (healthy)
- `chatbot-ollama` → Up (descargando llama3 la primera vez)
- `chatbot-n8n` → Up (healthy)
- `chatbot-n8n-init` → Exited (0) ← normal, hizo su trabajo y paro

### Ver progreso de descarga de Ollama:
```powershell
docker compose logs -f ollama
```

---

## PASO 8 - Configurar n8n (unica vez)

### 8.1 - Crear cuenta
1. Abre http://localhost:5678
2. Crea tu cuenta de admin

### 8.2 - Crear credencial PostgreSQL
1. Settings > Credentials > Add Credential
2. Busca "Postgres"
3. Configura:
   - Host: `postgres`
   - Database: `n8n_db`
   - User: `n8n_user`
   - Password: (la que pusiste en .env)
   - Port: `5432`
   - SSL: desactivado
4. Test Connection → debe decir "Connection successful"
5. Nombre: **"Chatbot Postgres"**
6. Guarda

### 8.3 - Vincular credencial al workflow
1. Ve a Workflows → veras "Chatbot con Memoria" (importado automaticamente)
2. Abre el workflow
3. En cada nodo de Postgres (Buscar Usuario, Obtener Conversacion, Cargar Historial, Guardar Mensajes), selecciona la credencial "Chatbot Postgres"
4. Activa el workflow (toggle arriba a la derecha)

---

## PASO 9 - Probar el chatbot

### Primer mensaje (crea conversacion nueva):
```powershell
curl -X POST http://localhost:5678/webhook/chat -H "Content-Type: application/json" -d "{\"user_id\": \"user-001\", \"message\": \"Hola, como te llamas?\"}"
```

Respuesta:
```json
{
  "response": "Hola! Soy un asistente...",
  "conversation_id": 1
}
```

### Segundo mensaje (misma conversacion, prueba memoria):
```powershell
curl -X POST http://localhost:5678/webhook/chat -H "Content-Type: application/json" -d "{\"user_id\": \"user-001\", \"conversation_id\": 1, \"message\": \"Que te dije en mi mensaje anterior?\"}"
```

### Nueva conversacion (sin memoria):
```powershell
curl -X POST http://localhost:5678/webhook/chat -H "Content-Type: application/json" -d "{\"user_id\": \"user-001\", \"message\": \"Hola de nuevo\"}"
```

---

## PASO 10 - Personalizacion

### Cambiar el system prompt (global):
Abre el workflow en n8n → nodo "Construir Prompt" → edita la constante `SYSTEM_PROMPT` en el codigo JavaScript.

### Añadir usuario:
```powershell
docker exec -it chatbot-postgres psql -U n8n_user -d n8n_db -c "INSERT INTO chatbot_users (external_id, name, email) VALUES ('user-002', 'Otro Usuario', 'otro@email.com');"
```

### Soft-delete de una conversacion:
```powershell
docker exec -it chatbot-postgres psql -U n8n_user -d n8n_db -c "UPDATE chatbot_conversations SET is_deleted = TRUE, deleted_at = NOW() WHERE id = 1;"
```

### Ver historial de una conversacion:
```powershell
docker exec -it chatbot-postgres psql -U n8n_user -d n8n_db -c "SELECT role, content, created_at FROM chatbot_messages WHERE conversation_id = 1 ORDER BY created_at;"
```

### Ver sesiones de un usuario:
```powershell
docker exec -it chatbot-postgres psql -U n8n_user -d n8n_db -c "SELECT logged_in_at, logged_out_at, is_active FROM chatbot_sessions WHERE user_id = 1 ORDER BY logged_in_at DESC;"
```

---

## Mantenimiento

| Comando | Que hace |
|---------|----------|
| `docker compose down` | Para todo (datos se mantienen) |
| `docker compose down -v` | Para todo Y borra datos |
| `docker compose logs -f` | Ver logs en tiempo real |
| `docker compose restart ollama` | Reiniciar un servicio |
| `docker compose pull && docker compose up -d` | Actualizar imagenes |

---

## Troubleshooting

| Problema | Solucion |
|----------|----------|
| n8n no arranca | `docker compose logs n8n` - verificar credenciales en .env |
| Ollama no responde | `docker compose logs ollama` - esperar a que termine la descarga |
| Tablas no se crearon | `docker compose down -v` y volver a arrancar (borra datos) |
| Llama 3 lento en CPU | Normal (30-60s por respuesta). Usa GPU o un modelo mas pequeño |
| Webhook 404 | Verificar que el workflow esta activo (no en modo test) |
| Workflow no aparece en n8n | `docker compose logs n8n-init` - o importar manualmente el JSON |
