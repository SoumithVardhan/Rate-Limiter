# Stage 1 — build React app
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
RUN npm run build

# Stage 2 — serve with nginx + runtime env var substitution
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf.template

# Default value — works with local Docker Compose (rate-limiter container name).
# Override RATE_LIMITER_URL in your deployment platform's env vars to point to
# wherever the rate-limiter service is running (internal network URL recommended).
#
# Examples:
#   Docker Compose        → http://rate-limiter:4000          (default below)
#   Railway internal net  → http://<service-name>.railway.internal:<port>
#   AWS ECS (Service Disc)→ http://<discovery-name>:4000
#   Azure Container Apps  → https://<app-name>.<env>.<region>.azurecontainerapps.io
#   Kubernetes            → http://<svc>.<namespace>.svc.cluster.local:4000
ENV RATE_LIMITER_URL=http://rate-limiter:4000

EXPOSE 80

# Substitute RATE_LIMITER_URL into nginx.conf at container start, then launch nginx.
# This means you can change the URL without rebuilding the image — just set the env var.
CMD ["/bin/sh", "-c", "envsubst '${RATE_LIMITER_URL}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
