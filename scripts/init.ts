import * as p from '@clack/prompts'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT_DIR = path.resolve(__dirname, '..')
const args = process.argv.slice(2)
const SKIP_RENAME = args.includes('--skip-rename')

const FILES_TO_UPDATE = [
  'docker-compose.yml',
  'package.json',
  'apps/backend/package.json',
  'apps/frontend/package.json',
  'apps/frontend/index.html',
  'apps/frontend/src/components/AppLayout/AppSidebar/index.tsx',
  'apps/worker/package.json',
  'packages/db/package.json',
  'packages/constants/package.json',
  'packages/ui/package.json',
  'packages/utils/package.json',
  'packages/feature-flags/package.json',
]

function replaceInFile(filePath: string, searchValue: string | RegExp, replaceValue: string) {
  const fullPath = path.join(ROOT_DIR, filePath)
  if (!fs.existsSync(fullPath)) {
    return false
  }
  const content = fs.readFileSync(fullPath, 'utf-8')
  const newContent = content.replace(searchValue, replaceValue)
  if (content !== newContent) {
    fs.writeFileSync(fullPath, newContent)
    return true
  }
  return false
}

function toTitleCase(str: string): string {
  return str
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function replaceProjectName(oldName: string, newName: string) {
  const oldTitleCase = toTitleCase(oldName)
  const newTitleCase = toTitleCase(newName)

  const replacements = [
    // Full project name strings for UI (must come first to avoid partial replacements)
    { search: /The Franklin Project/g, replace: newTitleCase },
    { search: /Franklin Project/g, replace: newTitleCase },
    // Standard replacements
    { search: new RegExp(oldName, 'g'), replace: newName },
    { search: new RegExp(oldName.replace(/-/g, '_'), 'g'), replace: newName.replace(/-/g, '_') },
    {
      search: new RegExp(oldName.charAt(0).toUpperCase() + oldName.slice(1), 'g'),
      replace: newName.charAt(0).toUpperCase() + newName.slice(1),
    },
    { search: new RegExp(oldTitleCase, 'g'), replace: newTitleCase },
  ]

  const updatedFiles: string[] = []

  for (const file of FILES_TO_UPDATE) {
    for (const { search, replace } of replacements) {
      if (replaceInFile(file, search, replace)) {
        if (!updatedFiles.includes(file)) {
          updatedFiles.push(file)
        }
      }
    }
  }

  return updatedFiles
}

function generateEnvFile() {
  const envExamplePath = path.join(ROOT_DIR, '.env.example')
  const envPath = path.join(ROOT_DIR, '.env')

  if (fs.existsSync(envPath)) {
    return false
  }

  const content = fs.readFileSync(envExamplePath, 'utf-8')
  fs.writeFileSync(envPath, content)
  return true
}

function exec(command: string, options?: { cwd?: string }) {
  return execSync(command, {
    cwd: options?.cwd ?? ROOT_DIR,
    stdio: 'inherit',
  })
}

async function main() {
  console.clear()

  p.intro('Welcome to the Franklin Project Starter Kit')

  let projectName = 'franklin'

  if (SKIP_RENAME) {
    p.log.info('Skipping project rename (--skip-rename flag detected)')
  } else {
    const nameInput = await p.text({
      message: 'What is the name of your project?',
      placeholder: 'the-franklin-project',
      validate: (value) => {
        if (!value) return 'Project name is required'
        if (!/^[a-z][a-z0-9-]*$/.test(value)) {
          return 'Project name must start with a letter and contain only lowercase letters, numbers, and hyphens'
        }
        return undefined
      },
    })

    if (p.isCancel(nameInput)) {
      p.cancel('Setup cancelled')
      process.exit(0)
    }

    projectName = nameInput
  }

  const spinner = p.spinner()

  // Step 1: Replace project name
  if (!SKIP_RENAME) {
    spinner.start('Replacing project name references...')
    const updatedFiles = replaceProjectName('franklin', projectName)
    spinner.stop(`Updated ${updatedFiles.length} files`)
  }

  // Step 2: Generate .env file
  spinner.start('Generating .env file...')
  const envCreated = generateEnvFile()
  spinner.stop(envCreated ? 'Created .env file' : '.env file already exists (skipped)')

  // Step 3: Start Docker containers
  const startDocker = await p.confirm({
    message: 'Start Docker containers (PostgreSQL, Redis)?',
    initialValue: true,
  })

  if (p.isCancel(startDocker)) {
    p.cancel('Setup cancelled')
    process.exit(0)
  }

  if (startDocker) {
    spinner.start('Starting Docker containers...')
    try {
      exec('docker compose up -d')
      spinner.stop('Docker containers started')

      // Wait for PostgreSQL to be ready
      spinner.start('Waiting for PostgreSQL to be ready...')
      let attempts = 0
      const maxAttempts = 30
      while (attempts < maxAttempts) {
        try {
          exec('docker compose exec -T postgres pg_isready -h localhost -U postgres', {
            cwd: ROOT_DIR,
          })
          break
        } catch {
          attempts++
          await new Promise((resolve) => setTimeout(resolve, 1000))
        }
      }
      if (attempts >= maxAttempts) {
        spinner.stop('PostgreSQL took too long to start. Please check your Docker setup.')
      } else {
        spinner.stop('PostgreSQL is ready')
      }
    } catch (error) {
      spinner.stop('Failed to start Docker containers. Make sure Docker is running.')
      p.log.error('Docker error: ' + (error as Error).message)
    }
  }

  // Step 4: Run database migrations
  const runMigrations = await p.confirm({
    message: 'Run database migrations?',
    initialValue: true,
  })

  if (p.isCancel(runMigrations)) {
    p.cancel('Setup cancelled')
    process.exit(0)
  }

  let migrationsSucceeded = false

  if (runMigrations) {
    spinner.start('Generating database migrations...')
    try {
      exec('pnpm db:generate')
      spinner.stop('Migrations generated')

      spinner.start('Applying database migrations...')
      exec('pnpm db:migrate')
      spinner.stop('Migrations applied')
      migrationsSucceeded = true
    } catch (error) {
      spinner.stop('Failed to run migrations')
      p.log.error((error as Error).message)
    }
  }

  // Step 5: Run seed script (only if migrations succeeded)
  if (migrationsSucceeded) {
    const runSeed = await p.confirm({
      message: 'Seed the database with initial data?',
      initialValue: true,
    })

    if (p.isCancel(runSeed)) {
      p.cancel('Setup cancelled')
      process.exit(0)
    }

    if (runSeed) {
      spinner.start('Seeding database...')
      try {
        exec('pnpm db:seed')
        spinner.stop('Database seeded')
      } catch (error) {
        spinner.stop('Failed to seed database')
        p.log.error((error as Error).message)
      }
    }
  } else if (runMigrations) {
    p.log.warn('Skipping seed because migrations failed')
  }

  p.outro('Project setup complete! Run `pnpm dev` to start developing.')
}

main().catch(console.error)
