import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryDirectory = path.resolve(scriptDirectory, '..');
const backendDirectory = path.join(repositoryDirectory, 'be');
const timeoutMilliseconds = 60_000;

function readDatabasePort() {
  const environmentPath = path.join(backendDirectory, '.env');
  if (!existsSync(environmentPath)) {
    throw new Error('Missing be/.env. Copy be/env.example to be/.env and set DATABASE_URL first.');
  }

  const databaseUrlLine = readFileSync(environmentPath, 'utf8')
    .split(/\r?\n/)
    .find((line) => line.trim().startsWith('DATABASE_URL='));

  if (!databaseUrlLine) {
    throw new Error('DATABASE_URL is missing from be/.env.');
  }

  const value = databaseUrlLine.slice(databaseUrlLine.indexOf('=') + 1).trim();
  try {
    return new URL(value.replace(/^['"]|['"]$/g, '')).port || '5432';
  } catch {
    throw new Error('DATABASE_URL in be/.env is not a valid PostgreSQL connection URL.');
  }
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? repositoryDirectory,
    env: options.env ?? process.env,
    encoding: 'utf8',
    stdio: options.stdio ?? 'inherit',
    shell: options.shell ?? false,
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    const failureHint = options.failureHint ? ` ${options.failureHint}` : '';
    throw new Error(`${command} ${args.join(' ')} failed.${failureHint}`);
  }
  return result.stdout?.trim() ?? '';
}

function dockerIsAvailable() {
  const result = spawnSync('docker', ['info'], {
    cwd: repositoryDirectory,
    encoding: 'utf8',
    stdio: 'pipe',
  });
  return !result.error && result.status === 0;
}

function composeArguments(port) {
  if (port === '5432') return ['compose', 'up', '-d'];

  if (!existsSync(path.join(repositoryDirectory, 'docker-compose.local.yml'))) {
    throw new Error(`Port ${port} requires docker-compose.local.yml, but the file is missing.`);
  }

  return ['compose', '-f', 'docker-compose.yml', '-f', 'docker-compose.local.yml', 'up', '-d', '--force-recreate'];
}

function healthStatus(containerName) {
  const result = spawnSync('docker', ['inspect', '--format', '{{.State.Health.Status}}', containerName], {
    cwd: repositoryDirectory,
    encoding: 'utf8',
    stdio: 'pipe',
  });
  return result.status === 0 ? result.stdout.trim() : 'unavailable';
}

async function waitForHealthyContainers() {
  const containers = ['flextrip_postgres', 'flextrip_redis'];
  const deadline = Date.now() + timeoutMilliseconds;

  while (Date.now() < deadline) {
    if (containers.every((name) => healthStatus(name) === 'healthy')) return;
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }

  const states = containers.map((name) => `${name}: ${healthStatus(name)}`).join(', ');
  throw new Error(`Docker services did not become healthy within 60 seconds (${states}).`);
}

async function main() {
  const port = readDatabasePort();
  if (!dockerIsAvailable()) {
    throw new Error('Docker Desktop is not running or cannot be accessed. Start Docker Desktop, wait for Engine running, then run npm run start:dev again.');
  }

  console.log(`Preparing local database on PostgreSQL port ${port}...`);
  run('docker', composeArguments(port), { env: { ...process.env, POSTGRES_PORT: port } });

  console.log('Waiting for PostgreSQL and Redis to become healthy...');
  await waitForHealthyContainers();

  const npxCommand = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  console.log('Applying Prisma migrations...');
  run(npxCommand, ['prisma', 'migrate', 'deploy'], {
    cwd: backendDirectory,
    shell: process.platform === 'win32',
  });
  console.log('Generating Prisma Client...');
  run(npxCommand, ['prisma', 'generate'], {
    cwd: backendDirectory,
    shell: process.platform === 'win32',
    failureHint: 'If Windows reports EPERM or a rename error, stop any older NestJS process with Ctrl+C, then run npm run start:dev again.',
  });
  console.log('Local database is ready. Starting NestJS...');
}

main().catch((error) => {
  console.error(`Database preparation stopped: ${error.message}`);
  process.exitCode = 1;
});
