# Production bundle, then only the static files in nginx.
FROM node:22-alpine AS build

WORKDIR /app

COPY package.json package-lock.json ./
COPY vendor/xlsx-0.20.3.tgz vendor/xlsx-0.20.3.tgz

# The image's npm binary stays at 10 and ignores corepack. package.json pins npm 11.6.1,
# and npm 10 rejects that lockfile. `corepack npm` is the pinned CLI.
RUN corepack enable && corepack prepare npm@11.6.1 --activate && corepack npm ci

COPY . .
RUN npx ng build --configuration production

FROM nginx:1.28-alpine

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/dist/atms-application/browser /usr/share/nginx/html

EXPOSE 80 443
