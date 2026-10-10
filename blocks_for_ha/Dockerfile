FROM node:24-alpine AS builder
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY index.html ./
COPY src/ ./src/
COPY public/ ./public/
RUN npm run build

FROM nginx:1.28-alpine
RUN apk add --no-cache python3 py3-pip
COPY requirements.txt /app/
RUN python3 -m venv /opt/blocks-python && /opt/blocks-python/bin/pip install --no-cache-dir --only-binary=:all: --require-hashes -r /app/requirements.txt
ENV PATH="/opt/blocks-python/bin:${PATH}"
ARG BUILD_VERSION
ARG BUILD_ARCH
LABEL io.hass.version="${BUILD_VERSION}" io.hass.type="app" io.hass.arch="${BUILD_ARCH}"
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY server.py run.sh /app/
RUN sed -i 's/\r$//' /app/run.sh && chmod +x /app/run.sh
COPY --from=builder /build/dist/ /usr/share/nginx/html/
EXPOSE 8099
CMD ["/app/run.sh"]
