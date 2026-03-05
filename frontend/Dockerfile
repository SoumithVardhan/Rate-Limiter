# Stage 1 — build React app
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
RUN npm run build

# Stage 2 — serve with nginx + env var substitution
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf.template

# Default: works with local Docker Compose
ENV RATE_LIMITER_URL=http://rate-limiter:4000

EXPOSE 80

# Substitute env vars into nginx.conf at container start, then launch nginx
CMD ["/bin/sh", "-c", "envsubst '${RATE_LIMITER_URL}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
