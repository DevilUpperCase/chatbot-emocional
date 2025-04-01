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

# Construir la aplicación con variables de entorno
ARG REACT_APP_GOOGLE_API_KEY
ENV REACT_APP_GOOGLE_API_KEY=$REACT_APP_GOOGLE_API_KEY

RUN npm run build

# Etapa de producción
FROM nginx:alpine

# Instalar curl para healthcheck
RUN apk add --no-cache curl

# Copiar la configuración personalizada de nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copiar los archivos construidos desde la etapa anterior
COPY --from=build /app/build /usr/share/nginx/html

# Crear directorio para logs
RUN mkdir -p /var/log/nginx

# Exponer el puerto 80
EXPOSE 80

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost/ || exit 1

# Iniciar nginx
CMD ["nginx", "-g", "daemon off;"] 