# Bun as the Overseer runtime

The SvelteKit server and Docker/git integration run on Bun rather than Node. Chosen for workstation speed and alignment with the operator’s stack; docker socket access and git subprocesses stay the same, but deployment and native-addon assumptions must stay Bun-compatible.
