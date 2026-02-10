# Chatbot Local con n8n + Ollama + PostgreSQL

Chatbot conversacional con memoria que corre 100% en local. Usa **Llama 3** como modelo de IA, **n8n** para la logica del flujo y **PostgreSQL** para almacenar usuarios, conversaciones y mensajes.

Ningun dato sale de tu maquina.

```
Webhook POST /chat
  -> Buscar Usuario
  -> Obtener/Crear Conversacion
  -> Cargar Historial
  -> Construir Prompt
  -> Llamar Ollama (Llama 3)
  -> Guardar Mensajes
  -> Responder
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
├── .env                          # Variables de entorno (NO se sube a Git)
├── .env.example                  # Plantilla del .env
├── docker-compose.yml            # Servicios (CPU)
├── docker-compose.gpu.yml        # Override para GPU NVIDIA
├── db/
│   └── init/
│       └── 01-init.sql           # Tablas SQL (se ejecuta solo la primera vez)
├── workflows/
│   └── chatbot-workflow.json     # Workflow de n8n (se importa automaticamente)
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

Edita `.env` y cambia los valores de las contrasenas:

| Variable | Que es |
|----------|--------|
| `POSTGRES_PASSWORD` | Contrasena de la base de datos |
| `N8N_BASIC_AUTH_PASSWORD` | Contrasena de acceso a n8n |
| `N8N_ENCRYPTION_KEY` | Cadena aleatoria para encriptar credenciales en n8n |

### 3. Levantar los contenedores

**CPU:**

```bash
docker compose up -d
```

**GPU NVIDIA:**

```bash
docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d
```

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

La primera vez, Ollama descarga el modelo Llama 3 (~4GB). Puedes ver el progreso con:

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

## Uso

### Enviar un mensaje (crea conversacion nueva)

```bash
curl -X POST http://localhost:5678/webhook/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user-001", "message": "Hola, como estas?"}'
```

**PowerShell:**

```powershell
Invoke-RestMethod -Method POST -Uri "http://localhost:5678/webhook/chat" -ContentType "application/json" -Body '{"user_id": "user-001", "message": "Hola, como estas?"}'
```

Respuesta:

```json
{
  "response": "Hola! Estoy bien, gracias...",
  "conversation_id": 1
}
```

### Continuar una conversacion (con memoria)

Incluye el `conversation_id` que recibiste:

```bash
curl -X POST http://localhost:5678/webhook/chat \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user-001", "conversation_id": 1, "message": "Que te dije antes?"}'
```

### Añadir un usuario

```bash
docker exec -it chatbot-postgres psql -U n8n_user -d n8n_db \
  -c "INSERT INTO chatbot_users (external_id, name, email) VALUES ('user-002', 'Nombre', 'email@ejemplo.com');"
```

## Personalizacion

### Cambiar el system prompt

Abre el workflow en n8n > nodo **"Construir Prompt"** > edita la variable `SYSTEM_PROMPT` en el codigo JavaScript.

### Base de datos

El chatbot usa 4 tablas:

| Tabla | Funcion |
|-------|---------|
| `chatbot_users` | Usuarios (nombre, email, activo/inactivo) |
| `chatbot_sessions` | Login/logout de usuarios |
| `chatbot_conversations` | Hilos de chat (con soft-delete) |
| `chatbot_messages` | Mensajes (role, contenido, tokens) |

## Comandos utiles

| Comando | Que hace |
|---------|----------|
| `docker compose down` | Para todo (los datos se mantienen) |
| `docker compose down -v` | Para todo y borra todos los datos |
| `docker compose logs -f` | Ver logs en tiempo real |
| `docker compose restart ollama` | Reiniciar un servicio |
| `docker compose pull && docker compose up -d` | Actualizar imagenes |

## Troubleshooting

| Problema | Solucion |
|----------|----------|
| n8n no arranca | `docker compose logs n8n` - verificar credenciales en `.env` |
| Ollama no responde | `docker compose logs ollama` - esperar a que termine la descarga |
| Tablas no se crearon | `docker compose down -v` y volver a arrancar (borra datos) |
| Llama 3 lento en CPU | Normal (30-60s por respuesta). Usa GPU o un modelo mas pequeno |
| Webhook 404 | Verificar que el workflow esta activo en n8n |
| Workflow no aparece | `docker compose logs n8n-init` o importar manualmente el JSON |
