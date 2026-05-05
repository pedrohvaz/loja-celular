import app from './app'

const PORT = process.env.PORT ?? 3333

app.listen(PORT, () => {
  console.log(`🚀 API running at http://localhost:${PORT}`)
  console.log(`   Environment: ${process.env.NODE_ENV ?? 'development'}`)
})
