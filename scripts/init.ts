import * as p from '@clack/prompts'
import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const ROOT_DIR = path.resolve(import.meta.dirname, '..')

const FILES_TO_UPDATE = [
  'docker-compose.yml',
  'package.json',
  'apps/backend/package.json',
  'apps/frontend/package.json',
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

function replaceProjectName(oldName: string, newName: string) {
  const replacements = [
    { search: new RegExp(oldName, 'g'), replace: newName },
    { search: new RegExp(oldName.replace(/-/g, '_'), 'g'), replace: newName.replace(/-/g, '_') },
    {
      search: new RegExp(oldName.charAt(0).toUpperCase() + oldName.slice(1), 'g'),
      replace: newName.charAt(0).toUpperCase() + newName.slice(1),
    },
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

function generateEnvFile(projectName: string) {
  const envExamplePath = path.join(ROOT_DIR, '.env.example')
  const envPath = path.join(ROOT_DIR, '.env')

  if (fs.existsSync(envPath)) {
    return false
  }

  let content = fs.readFileSync(envExamplePath, 'utf-8')
  content = content.replace(/franklin/g, projectName)

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

  const projectName = await p.text({
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

  if (p.isCancel(projectName)) {
    p.cancel('Setup cancelled')
    process.exit(0)
  }

  const spinner = p.spinner()

  // Step 1: Replace project name
  spinner.start('Replacing project name references...')
  const updatedFiles = replaceProjectName('franklin', projectName)
  spinner.stop(`Updated ${updatedFiles.length} files`)

  // Step 2: Generate .env file
  spinner.start('Generating .env file...')
  const envCreated = generateEnvFile(projectName)
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
          exec('docker compose exec -T postgres pg_isready -U postgres', { cwd: ROOT_DIR })
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

  if (runMigrations) {
    spinner.start('Generating database migrations...')
    try {
      exec('pnpm db:generate')
      spinner.stop('Migrations generated')
    } catch (error) {
      spinner.stop('Failed to generate migrations')
      p.log.error((error as Error).message)
    }

    spinner.start('Applying database migrations...')
    try {
      exec('pnpm db:migrate')
      spinner.stop('Migrations applied')
    } catch (error) {
      spinner.stop('Failed to apply migrations')
      p.log.error((error as Error).message)
    }
  }

  // Step 5: Run seed script
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

  p.outro('Project setup complete! Run `pnpm dev` to start developing.')
}

main().catch(console.error)
