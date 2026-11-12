# Compose project and service name as primary container binding

Each Managed Service binds logs via Compose project name plus service name, with explicit Docker container name only when compose metadata is absent. That matches how microservices are usually run locally and stays stable across container recreates; raw container IDs would break on every restart.
