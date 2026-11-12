# Host-native Overseer with local Docker socket

Overseer v1 runs as a process on the developer's workstation with access to `docker.sock` and local working tree paths. A containerized Overseer would require mounting the socket plus every registered repo path; solo local-dev scope favors direct host access and simple git subprocess calls on those paths.
