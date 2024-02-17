FROM node:alpine

COPY ./package.json .
COPY ./package-lock.json .

RUN npm i 

COPY ./dist/ .

CMD node ./index.js