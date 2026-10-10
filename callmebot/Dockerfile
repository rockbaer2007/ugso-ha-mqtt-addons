ARG BUILD_ARCH=amd64
FROM ghcr.io/home-assistant/${BUILD_ARCH}-base-python:3.12-alpine3.24
ARG BUILD_VERSION=0.1.0
ARG BUILD_ARCH
LABEL io.hass.version="${BUILD_VERSION}" io.hass.type="app" io.hass.arch="${BUILD_ARCH}"
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY app ./
COPY run.sh /run.sh
RUN chmod +x /run.sh
CMD ["/run.sh"]
