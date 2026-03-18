FROM node:18

WORKDIR /usr/src/app

COPY apigateway/ .  

RUN npm install

EXPOSE 3000

CMD [ "node", "index.js" ]