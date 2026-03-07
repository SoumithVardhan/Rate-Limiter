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

# At container start:
#   1. Read the real DNS nameserver from /etc/resolv.conf (works on any platform).
#   2. Substitute both RATE_LIMITER_URL and DNS_RESOLVER into nginx.conf.
#   3. Launch nginx.
# This lets you change the upstream URL without rebuilding the image, and ensures
# nginx uses the platform's actual DNS so it re-resolves hostnames dynamically.
CMD ["/bin/sh", "-c", "DNS_IP=$(grep -m1 '^nameserver' /etc/resolv.conf | awk '{print $2}') && if echo \"$DNS_IP\" | grep -q ':'; then DNS_RESOLVER=\"[$DNS_IP]\"; else DNS_RESOLVER=\"$DNS_IP\"; fi && export DNS_RESOLVER && envsubst '${RATE_LIMITER_URL} ${DNS_RESOLVER}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
