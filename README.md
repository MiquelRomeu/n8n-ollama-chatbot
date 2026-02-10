# Chatbot Local con n8n + Ollama + PostgreSQL

Chatbot conversacional con memoria que corre 100% en local. Incluye interfaz web con login, registro y gestion de conversaciones.

Usa **Llama 3** como modelo de IA, **n8n** para la logica del flujo, **PostgreSQL** para la base de datos y **Next.js** para el frontend.

Ningun dato sale de tu maquina.

```
┌─────────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Frontend       │────>│     n8n      │────>│   Ollama     │     │  PostgreSQL  │
│  (Next.js)      │     │  (Workflows) │     │  (Llama 3)   │     │  (BD)        │
│  Puerto: 3000   │     │  Puerto: 5678│     │  Puerto:11434│     │  Puerto: 5432│
└────────┬────────┘     └──────────────┘     └──────────────┘     └──────┬───────┘
         │                                                                │
         └────────────────────────────────────────────────────────────────┘
                        Conexion directa para auth y datos
```

## Requisitos

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado y corriendo
- En Windows: WSL2 habilitado
- (Opcional) GPU NVIDIA + [NVIDIA Container Toolkit](https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/latest/install-guide.html) para respuestas mas rapidas

Verifica con:

```bash
docker --version
docker compose version
```

## Estructura del proyecto

```
n8n-ollama-chatbot/
├── .env                              # Variables de entorno (NO se sube a Git)
├── .env.example                      # Plantilla del .env
├── docker-compose.yml                # Servicios (CPU)
├── docker-compose.gpu.yml            # Override para GPU NVIDIA
├── db/
│   └── init/
│       ├── 01-init.sql               # Tablas SQL (auto-ejecuta la primera vez)
│       └── 02-add-password.sql       # Migracion: soporte de passwords
├── workflows/
│   └── chatbot-workflow.json         # Workflow de n8n (se importa automaticamente)
├── frontend/                         # App Next.js (se construye en Docker)
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── app/                      # Paginas y API routes
│       ├── components/               # Componentes React
│       ├── lib/                      # DB, sesiones, auth
│       └── types/                    # TypeScript interfaces
└── README.md
```

## Setup

### 1. Clonar el repositorio

```bash
git clone <url-del-repo>
cd n8n-ollama-chatbot
```

### 2. Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` y cambia los valores:

| Variable | Que es |
|----------|--------|
| `POSTGRES_PASSWORD` | Contrasena de la base de datos |
| `N8N_BASIC_AUTH_PASSWORD` | Contrasena de acceso a n8n |
| `N8N_ENCRYPTION_KEY` | Cadena aleatoria para encriptar credenciales en n8n |
| `SESSION_SECRET` | Cadena aleatoria de al menos 32 caracteres (para sesiones del frontend) |

### 3. Levantar los contenedores

**CPU:**

```bash
docker compose up -d --build
```

**GPU NVIDIA:**

```bash
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d --build
```

La primera vez tarda unos minutos: se construye el frontend, se descarga Llama 3 (~4GB) y se inicializa la BD.

### 4. Verificar que todo esta corriendo

```bash
docker compose ps
```

Deberias ver:

| Contenedor | Estado |
|------------|--------|
| `chatbot-postgres` | Up (healthy) |
| `chatbot-ollama` | Up |
| `chatbot-n8n` | Up (healthy) |
| `chatbot-n8n-init` | Exited (0) - normal |
| `chatbot-frontend` | Up |

Ver progreso de descarga de Ollama:

```bash
docker compose logs -f ollama
```

### 5. Configurar n8n (solo una vez)

1. Abre **http://localhost:5678** en el navegador
2. Crea tu cuenta de administrador

#### Crear credencial de PostgreSQL

1. En el menu lateral, ve a **Credentials** > **Add Credential**
2. Busca **Postgres** y rellena:
   - **Host:** `postgres`
   - **Database:** `n8n_db`
   - **User:** `n8n_user`
   - **Password:** la que pusiste en `.env`
   - **Port:** `5432`
   - **SSL:** desactivado
3. Pulsa **Test Connection** (debe salir "Connection successful")
4. Nombre: **Chatbot Postgres**
5. Guarda

#### Vincular credencial al workflow

1. Ve a **Workflows** > abre **"Chatbot con Memoria"**
   - Si no aparece, importalo manualmente: menu del workflow > **Import from file** > selecciona `workflows/chatbot-workflow.json`
2. Haz click en cada nodo de Postgres (**Buscar Usuario**, **Obtener Conversacion**, **Cargar Historial**, **Guardar Mensajes**) y selecciona la credencial **"Chatbot Postgres"**
3. Activa el workflow con el toggle de arriba a la derecha
4. Guarda

### 6. Usar el chatbot

Abre **http://localhost:3000** en el navegador.

- **Registrate** con nombre, email y contrasena
- O usa el **usuario de prueba**: `test@test.com` / `test1234`
- Crea conversaciones, envia mensajes y el chatbot responde con memoria

## Uso por API (opcional)

Tambien puedes usar el chatbot directamente por API:

```bash
curl -X POST http://localhost:5678/webhook/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user-001", "message": "Hola, como estas?"}'
```

**PowerShell:**

```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:5678/webhook/chat" -ContentType "application/json" -Body '{"user_id": "user-001", "message": "Hola, como estas?"}'
```

Para continuar una conversacion, incluye `conversation_id`:

```bash
curl -X POST http://localhost:5678/webhook/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user-001", "conversation_id": 1, "message": "Que te dije antes?"}'
```

## Personalizacion

### Cambiar el system prompt

Abre el workflow en n8n > nodo **"Construir Prompt"** > edita la variable `SYSTEM_PROMPT` en el codigo JavaScript.

### Base de datos

El chatbot usa 4 tablas:

| Tabla | Funcion |
|-------|---------|
| `chatbot_users` | Usuarios (nombre, email, password, activo/inactivo) |
| `chatbot_sessions` | Login/logout de usuarios |
| `chatbot_conversations` | Hilos de chat (con soft-delete) |
| `chatbot_messages` | Mensajes (role, contenido, tokens) |

## Comandos utiles

| Comando | Que hace |
|---------|----------|
| `docker compose down` | Para todo (los datos se mantienen) |
| `docker compose down -v` | Para todo y borra todos los datos |
| `docker compose up -d --build` | Reconstruir y levantar (tras cambios en frontend) |
| `docker compose logs -f` | Ver logs en tiempo real |
| `docker compose logs -f frontend` | Ver logs solo del frontend |
| `docker compose restart ollama` | Reiniciar un servicio |

## Troubleshooting

| Problema | Solucion |
|----------|----------|
| n8n no arranca | `docker compose logs n8n` - verificar credenciales en `.env` |
| Ollama no responde | `docker compose logs ollama` - esperar a que termine la descarga |
| Tablas no se crearon | `docker compose down -v` y volver a arrancar (borra datos) |
| Llama 3 lento en CPU | Normal (30-60s por respuesta). Usa GPU o un modelo mas pequeno |
| Webhook 404 | Verificar que el workflow esta activo en n8n |
| Workflow no aparece | `docker compose logs n8n-init` o importar manualmente el JSON |
| Frontend no carga | `docker compose logs frontend` - verificar `SESSION_SECRET` en `.env` |
| Login no funciona | Si la BD ya existia, ejecutar `docker compose down -v` para resetear |
