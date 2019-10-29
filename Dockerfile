FROM node:12-slim

WORKDIR /app
COPY package*.json /app/
#RUN npm install --production
RUN npm ci --only=production
COPY . .

EXPOSE 8080
CMD [ "node", "app.js" ]