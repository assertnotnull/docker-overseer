/** Persisted container attachment (ADR-0002). */
export type ContainerBinding =
	| { kind: 'compose'; project: string; service: string }
	| { kind: 'name'; name: string };

export type ManagedService = {
	id: string;
	displayName: string;
	workingTreePath: string;
	composeProject: string;
	bindings: ContainerBinding[];
	order: number;
};

export type RegistryFile = {
	version: 1;
	services: ManagedService[];
};

export type RuntimeStatus = 'running' | 'stopped' | 'error';

export type BindingState = {
	binding: ContainerBinding;
	label: string;
	running: boolean;
	error: boolean;
	containerId: string | null;
};

export type ManagedServiceView = ManagedService & {
	branch: string;
	runtimeStatus: RuntimeStatus;
	bindingsUp: number;
	bindingsTotal: number;
	bindingStates: BindingState[];
};

export type DockerContainerOption = {
	id: string;
	name: string;
	project: string | null;
	composeService: string | null;
};

export type LogLine = {
	time?: Date;
	stream: 'stdout' | 'stderr';
	text: string;
};
