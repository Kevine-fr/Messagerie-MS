FROM node:18

WORKDIR /usr/src/app

COPY message/ .  

RUN npm install

EXPOSE 3000

CMD [ "node", "index.js" ]