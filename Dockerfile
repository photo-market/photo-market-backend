FROM node:12-slim

WORKDIR /app
COPY . .

EXPOSE 8080
CMD [ "node", "app.js" ]