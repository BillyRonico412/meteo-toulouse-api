FROM node:20-alpine3.17

COPY ./package.json /app/package.json

RUN cd /app && npm install

COPY . /app

WORKDIR /app

CMD npm run prod