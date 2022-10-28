from node:16
ENV NODE_ENV production
WORKDIR /app
COPY package*.json /app
RUN npm ci
COPY . .
RUN npm run build
CMD ["node", "build/index.js"]
EXPOSE 5555
