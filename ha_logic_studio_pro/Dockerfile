FROM python:3.13-alpine
WORKDIR /app
RUN apk add --no-cache nodejs npm
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund
COPY runtime/ ./runtime/
COPY server.py LICENSE THIRD-PARTY.txt ./
COPY ha_import.py requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY web/ ./web/
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
EXPOSE 8097
CMD ["python", "server.py", "--ha-app", "--port", "8097", "--no-browser"]
