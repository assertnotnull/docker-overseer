# Bind Overseer to localhost only

The dev server listens on loopback only because it exposes Docker socket–backed APIs and reads arbitrary host paths. Solo local tooling does not warrant LAN exposure or authentication in the first version.
