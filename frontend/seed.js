import dotenv from 'dotenv' 
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '../.env') })

const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:8000'
const API_BASE = `${BACKEND_URL}/api/v1/records`

// Seed using backend API
async function seed() {
  const raw = JSON.parse(
    readFileSync(join(__dirname, '../data/data3.json'), 'utf-8')
  )

  console.log(`Starting to seed ${raw.length} diaries via backend API...`)

  // First, get all existing records and delete them
  try {
    const existingRes = await fetch(API_BASE)
    if (existingRes.ok) {
      const existing = await existingRes.json()
      console.log(`Found ${existing.length} existing records, deleting...`)

      for (const record of existing) {
        await fetch(`${API_BASE}/${record.id}`, { method: 'DELETE' })
      }
      console.log('Existing records deleted')
    }
  } catch (e) {
    console.warn('Could not delete existing records:', e.message)
  }

  // Insert new records via backend API
  let successCount = 0
  let errorCount = 0

  for (const item of raw) {
    try {
      const payload = {
        title: item.title,
        content: item.content ?? '',
        feel: Array.isArray(item.feel) ? item.feel : [],
        date: item.date,
        userId: 'default',
      }

      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail || `Failed with status ${res.status}`)
      }

      successCount++
      console.log(`✓ [${successCount}/${raw.length}] ${item.title}`)
    } catch (e) {
      errorCount++
      console.error(`✗ Failed to insert "${item.title}":`, e.message)
    }
  }

  console.log(`\nSeeding completed: ${successCount} succeeded, ${errorCount} failed`)
  process.exit(errorCount > 0 ? 1 : 0)
}

if (process.argv.includes('seed')) {
  seed().catch((e) => {
    console.error('Seed error:', e)
    process.exit(1)
  })
} else {
  console.log('Run with "seed" argument to seed data: node seed.js seed')
  console.log('Make sure backend server is running before seeding.')
  process.exit(0)
}
