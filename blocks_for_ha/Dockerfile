FROM node:24-alpine AS builder
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html ./
COPY src/ ./src/
COPY public/ ./public/
RUN npm run build

FROM nginx:1.28-alpine
ARG BUILD_VERSION
ARG BUILD_ARCH
LABEL io.hass.version="${BUILD_VERSION}" io.hass.type="app" io.hass.arch="${BUILD_ARCH}"
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /build/dist/ /usr/share/nginx/html/
EXPOSE 8099
CMD ["nginx", "-g", "daemon off;"]
