# Etapa de construcción
FROM node:18-alpine as build

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar el resto del código fuente
COPY . .

# Construir la aplicación
RUN npm run build

# Etapa de producción
FROM nginx:alpine

# Etiqueta para identificar el servicio
LABEL name="n8n-chatbot-emocional"
LABEL version="1.0"

# Copiar la configuración de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los archivos construidos
COPY --from=build /app/build /usr/share/nginx/html

# Exponer el puerto 80
EXPOSE 80

# Healthcheck básico
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

# Iniciar nginx
CMD ["nginx", "-g", "daemon off;"] 