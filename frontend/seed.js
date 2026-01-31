import dotenv from 'dotenv'
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: join(__dirname, '../.env') })

// Schema
const DiarySchema = new mongoose.Schema(
  { title: String, date: Date, feel: [String], content: String },
  { timestamps: true }
)
const Diary = mongoose.models.Diary ?? mongoose.model('Diary', DiarySchema)

// Seed
async function seed() {
  await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DATABASE ?? 'outbrain',
  })
  const raw = JSON.parse(
    readFileSync(join(__dirname, '../data/data1.json'), 'utf-8')
  )
  const data = raw.map((d) => ({
    title: d.title,
    date: new Date(d.date),
    feel: d.feel ?? [],
    content: d.content ?? '',
  }))
  await Diary.deleteMany({})
  await Diary.insertMany(data)
  console.log(`Inserted ${data.length} diaries`)
  await mongoose.disconnect()
  process.exit(0)
}

if (process.argv.includes('seed')) {
  seed().catch((e) => {
    console.error(e)
    process.exit(1)
  })
} else {
  ;(async () => {
    const app = express()
    app.use(cors())
    app.use(express.json())

    app.get('/api/diaries', async (_req, res) => {
      try {
        const docs = await Diary.find().sort({ date: 1 }).lean()
        res.json(docs.map((d) => ({ id: String(d._id), ...d })))
      } catch (e) {
        res.status(500).json({ error: 'Failed' })
      }
    })

    await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.MONGODB_DATABASE ?? 'outbrain',
    })
    const PORT = process.env.PORT ?? 3001
    app.listen(PORT, () => console.log(`http://localhost:${PORT}`))
  })()
}
