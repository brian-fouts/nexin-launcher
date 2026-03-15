# Production: build and serve with nginx.
# Build from project dir: docker build -f Dockerfile .

FROM node:22-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
ENV NODE_ENV=
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
