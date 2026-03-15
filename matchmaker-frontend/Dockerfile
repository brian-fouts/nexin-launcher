# Production: build frontend and serve with nginx.
# Build from project dir: docker build -f Dockerfile .

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
ENV NODE_ENV=
RUN npm install

COPY . .
ARG VITE_API_URL=
ARG VITE_WS_URL=
ARG VITE_DISCORD_AUTHORIZE_URL=
ARG VITE_GAME_FRONTEND_URL=
ENV VITE_API_URL=$VITE_API_URL VITE_WS_URL=$VITE_WS_URL VITE_DISCORD_AUTHORIZE_URL=$VITE_DISCORD_AUTHORIZE_URL VITE_GAME_FRONTEND_URL=$VITE_GAME_FRONTEND_URL
RUN node ./node_modules/vite/bin/vite.js build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
