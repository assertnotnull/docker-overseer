# Docker Overseer

A local developer tool that registers microservice working trees and their Docker containers, then tails container logs in one UI.

## Language

**Managed Service**:
A registered unit the operator cares about as one microservice: one working tree on disk plus the Docker containers whose stdout/stderr belong to that unit.
_Avoid_: Service (alone), project, stack

**Working tree path**:
The local directory Overseer uses to resolve git branch and (optionally) compose context for a Managed Service.
_Avoid_: Repo path, local file path, root path

**Container binding**:
The rule that maps a Managed Service to one or more running containers, expressed primarily as Compose project plus service name, with explicit container name as a fallback.
_Avoid_: Container ref, target, link

**Overseer**:
The host-native application that reads the service registry, talks to the Docker Engine, and serves the UI.
_Avoid_: Agent, dashboard, console

**Log pane**:
The right-hand view showing log output for the current selection in the sidebar. In the first version exactly one Managed Service is selected at a time; later versions may select several and show each service’s logs together without replacing the per-container tab model inside a service.
_Avoid_: Log panel, viewer, stream panel

**Sidebar selection**:
Which Managed Service row is active for the log pane. Version one allows a single selected row; multi-row selection is a planned extension, not part of the initial scope.
_Avoid_: Active service, checked services

**Git branch label**:
The current branch name of the working tree path, shown next to the Managed Service name in the sidebar with no dirty-state or commit metadata.
_Avoid_: Branch badge, version label

**Runtime status**:
Overseer’s summary of Docker state for a Managed Service’s bindings, independent of log text. Drives sidebar styling only; log lines that mention errors or stack traces do not change runtime status.
_Avoid_: Health, liveness, log level

**Stopped**:
No bound container is running (not created, exited cleanly, or compose service scaled to zero). The Managed Service display name appears subdued in the sidebar.
_Avoid_: Down, offline, inactive

**Runtime error**:
At least one bound container is in a failure state Docker reports (e.g. exited non-zero, dead, or repeatedly restarting after crash). The display name is shown in an error style with an icon. Error-looking log output alone does not produce this state.
_Avoid_: Unhealthy, failed service, log error

**Running**:
At least one bound container is up and not in runtime error. Default sidebar presentation when neither stopped nor runtime error applies.
_Avoid_: Healthy, up, active

**Add service dialog**:
The modal opened from a sidebar action to create a Managed Service: working tree path, display name, compose project name, and one or more container bindings.
_Avoid_: Registration form, wizard, new project modal

**Container picker**:
A select control in the add-or-edit flow whose options come from the live Docker Engine container list (typically running and stopped), used to attach bindings instead of typing names by hand.
_Avoid_: Container dropdown, docker autocomplete
