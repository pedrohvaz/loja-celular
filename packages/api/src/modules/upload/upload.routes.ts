import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { put } from '@vercel/blob'
import { authenticate } from '../../shared/middleware/auth'

const router = Router()

// Na Vercel o disco é somente leitura: com BLOB_READ_WRITE_TOKEN definido,
// as imagens vão para o Vercel Blob; sem ele (dev local), para public/uploads.
const useBlob = !!process.env.BLOB_READ_WRITE_TOKEN
const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
if (!useBlob && !fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true })

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (allowed.includes(file.mimetype)) return cb(null, true)
    cb(new Error('Apenas imagens são permitidas (JPEG, PNG, WebP)'))
  },
})

router.post('/', authenticate, (req: Request, res: Response, next: NextFunction) => {
  upload.single('file')(req, res, async (err) => {
    if (err) return res.status(400).json({ error: err.message })
    if (!req.file) return res.status(400).json({ error: 'Nenhum arquivo enviado' })

    const ext = path.extname(req.file.originalname).toLowerCase()
    const name = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`

    try {
      if (useBlob) {
        const blob = await put(`uploads/${name}`, req.file.buffer, {
          access: 'public',
          contentType: req.file.mimetype,
        })
        return res.json({ url: blob.url })
      }

      fs.writeFileSync(path.join(uploadsDir, name), req.file.buffer)
      const baseUrl = process.env.API_URL ?? `http://localhost:${process.env.PORT ?? 3333}`
      return res.json({ url: `${baseUrl}/uploads/${name}` })
    } catch (e) {
      return next(e)
    }
  })
})

export default router
