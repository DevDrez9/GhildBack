# 1. Usar una imagen ligera de Node.js
FROM node:20-alpine

# 2. Instalar herramientas necesarias para que Prisma funcione
RUN apk add --no-cache openssl

# 3. Crear la carpeta de trabajo dentro del contenedor
WORKDIR /app

# 4. Copiar los archivos de configuración primero (para aprovechar la caché)
COPY package*.json ./
COPY prisma ./prisma/

# 5. Instalar las dependencias del proyecto
RUN npm install

# 6. Generar el cliente de Prisma (necesario para conectar a la DB)
RUN npx prisma generate

# 7. Copiar el resto del código fuente
COPY . .

# 8. Construir la aplicación (crear la versión optimizada)
RUN npm run build

# 9. Avisar que la app usará el puerto 3000


# 10. Comando de arranque: Ejecuta migraciones y luego inicia la app
CMD ["sh", "-c", "npx prisma migrate deploy && npm run start:prod"]