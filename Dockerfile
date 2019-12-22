FROM node:10.17.0-alpine
WORKDIR /usr/src/app
COPY package.json ./
RUN npm i
COPY tsconfig.json ./
COPY ./src ./src
RUN npm run build
RUN rm -rf ./node_modules
RUN rm -rf ./src
RUN rm tsconfig.json
RUN npm i --only=prod
RUN rm package.json
RUN rm package-lock.json
CMD ["node", "build/index.js"]