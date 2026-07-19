FROM node:20-alpine AS automation-ui
WORKDIR /repo/products/automation-portal/frontend
COPY products/automation-portal/frontend/package*.json ./
RUN npm ci
COPY shared/ /repo/shared/
COPY products/automation-portal/frontend/ ./
ENV VITE_BASE=/automation/
RUN npm run build

FROM node:20-alpine AS api-ui
WORKDIR /repo/products/api-testing/frontend
COPY products/api-testing/frontend/package*.json ./
RUN npm ci
COPY products/api-testing/frontend/ ./
ENV VITE_BASE=/apitest/
RUN npm run build

FROM node:20-alpine AS shell-ui
WORKDIR /repo/platform/shell
COPY platform/shell/package*.json ./
RUN npm ci
COPY shared/ /repo/shared/
COPY platform/shell/ ./
RUN npm run build

FROM nginx:alpine
COPY gateway/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=shell-ui /repo/platform/shell/dist/ /usr/share/nginx/html/
COPY --from=automation-ui /repo/products/automation-portal/frontend/dist/ /usr/share/nginx/html/automation/
COPY --from=api-ui /repo/products/api-testing/frontend/dist/ /usr/share/nginx/html/apitest/
