FROM node:8-alpine

COPY . .

RUN npm install

ENTRYPOINT [ "node", "index.js" ]