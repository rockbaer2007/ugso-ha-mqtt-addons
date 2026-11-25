FROM python:3.13-alpine
WORKDIR /app
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY app_server.py installer.py ./
COPY app_static/ ./app_static/
COPY custom_components/ ./custom_components/
COPY www/ ./www/
ENV PYTHONUNBUFFERED=1
CMD ["python", "app_server.py"]
