FROM python:3.13-alpine
WORKDIR /app
COPY app/ ./
RUN pip install --no-cache-dir -r requirements.txt
COPY web/ ./web/
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
EXPOSE 8098
CMD ["python", "main.py"]
