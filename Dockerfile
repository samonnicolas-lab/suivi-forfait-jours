# Étape 1 : build du frontend (Vite) — nécessite les devDependencies.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install
COPY index.html vite.config.js ./
COPY public ./public
COPY src ./src
ARG VITE_AUTH_URL=https://auth.carlezia.fr
ENV VITE_AUTH_URL=$VITE_AUTH_URL
RUN npm run build

# Étape 2 : serveur de production — sert l'API et les fichiers statiques du build.
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY src ./src
COPY --from=build /app/dist ./dist
EXPOSE 4000
CMD ["node", "src/server/index.js"]
