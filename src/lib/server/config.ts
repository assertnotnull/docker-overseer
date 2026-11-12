import { homedir } from 'node:os';
import { join } from 'node:path';

export const CONFIG_DIR = join(homedir(), '.config', 'docker-overseer');
export const REGISTRY_PATH = join(CONFIG_DIR, 'services.yaml');

export const LOG_BUFFER_MAX = 10_000;
