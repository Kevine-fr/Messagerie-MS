FROM node:18

WORKDIR /usr/src/app

COPY message_service/ .  

RUN npm install
RUN npm install mongoose
RUN npm install dotenv

EXPOSE 3000

CMD [ "node", "index.js" ]
