FROM python:3.13-alpine
WORKDIR /app
COPY server.py THIRD-PARTY.txt ./
COPY ha_import.py requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY web/ ./web/
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
EXPOSE 8097
CMD ["python", "server.py", "--ha-app", "--port", "8097", "--no-browser"]
