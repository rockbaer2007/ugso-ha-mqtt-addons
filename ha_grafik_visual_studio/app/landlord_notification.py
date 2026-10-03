"""Build a bounded notification command for an explicitly selected HA destination."""
import re


def notification_command(request):
    if not isinstance(request, dict) or set(request) - {"service", "entity_id", "message", "priority", "subject"}:
        raise ValueError("Ungültige Benachrichtigung.")
    service = request.get("service")
    if not isinstance(service, str) or not re.fullmatch(r"notify\.[a-z0-9_]{1,100}", service) or service in {"notify.notify", "notify.persistent_notification"}:
        raise ValueError("Ein konkretes notify-Ziel ist erforderlich.")
    entity = request.get("entity_id", "")
    if service == "notify.send_message":
        if not isinstance(entity, str) or not re.fullmatch(r"notify\.[a-z0-9_]{1,100}", entity):
            raise ValueError("Eine konkrete notify-Entität ist erforderlich.")
    elif entity:
        raise ValueError("Die Entitätsauswahl gilt nur für notify.send_message.")
    message, subject, priority = request.get("message"), request.get("subject", ""), request.get("priority")
    if not isinstance(message, str) or not message.strip() or len(message) > 10000:
        raise ValueError("Die Nachricht muss 1 bis 10.000 Zeichen enthalten.")
    if not isinstance(subject, str) or len(subject) > 200 or not isinstance(priority, str) or priority not in {"information", "important", "urgent"}:
        raise ValueError("Ungültiger Betreff oder Priorität.")
    command = {"type": "call_service", "domain": "notify", "service": service.split(".", 1)[1], "service_data": {"message": f"{subject.strip() + chr(10) if subject.strip() else ''}[{priority}] {message.strip()}"}}
    if service == "notify.send_message":
        command["target"] = {"entity_id": entity}
    return command
