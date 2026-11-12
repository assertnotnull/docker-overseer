import type { ContainerBinding } from './types';

export function bindingLabel(binding: ContainerBinding): string {
	if (binding.kind === 'compose') {
		return `${binding.project}/${binding.service}`;
	}
	return binding.name;
}
