# Environnement de développement unique pour l'app 10x.
# Aucun Node n'est nécessaire sur Windows : tout s'exécute ici.
FROM node:22-alpine

RUN apk add --no-cache git

WORKDIR /app

# node_modules est monté en volume nommé (voir docker-compose.yml).
# Le dossier doit exister ET appartenir à `node` DANS L'IMAGE : Docker recopie
# son contenu et ses droits dans le volume neuf au premier démarrage.
RUN mkdir -p /app/node_modules && chown -R node:node /app
USER node

EXPOSE 5173 4173

CMD ["npm", "run", "dev"]
