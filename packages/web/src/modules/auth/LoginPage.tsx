import { useState } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/shared/hooks/useAuth'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import api from '@/shared/api/axios'

const schema = z.object({
  slug: z.string().min(1, 'Obrigatório'),
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Obrigatório'),
})
type FormData = z.infer<typeof schema>

export default function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const registered = searchParams.get('registered') === '1'
  const { login } = useAuth()
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { slug: 'demo' },
  })

  async function onSubmit(data: FormData) {
    setError('')
    try {
      const res = await api.post('/auth/login', data)
      login(res.data.user, res.data.accessToken, res.data.refreshToken)
      navigate('/admin/dashboard')
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } } }
      setError(e.response?.data?.error ?? 'Erro ao fazer login')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-background p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold">Acesso ao Sistema</h1>
          <p className="text-muted-foreground text-sm mt-1">Entre com suas credenciais</p>
        </div>

        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Empresa (slug)" placeholder="demo" error={errors.slug?.message} {...register('slug')} />
            <Input label="E-mail" type="email" placeholder="admin@demo.com" error={errors.email?.message} {...register('email')} />
            <Input label="Senha" type="password" placeholder="••••••••" error={errors.password?.message} {...register('password')} />
            {registered && <p className="text-sm text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-center">Conta criada! Faça login para acessar o sistema.</p>}
            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            <Button type="submit" className="w-full" loading={isSubmitting}>Entrar</Button>
          </form>

          <div className="text-xs text-muted-foreground text-center border-t pt-4 space-y-1">
            <p>Demo: <strong>admin@demo.com</strong> / <strong>admin123</strong></p>
            <p>Empresa: <strong>demo</strong></p>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Ainda não tem uma conta?{' '}
          <Link to="/cadastro" className="text-primary font-medium hover:underline">
            Criar conta grátis
          </Link>
        </p>
      </div>
    </div>
  )
}
