FROM node:16-alpine
COPY . .
RUN npm install
CMD ["node", "server.js"]