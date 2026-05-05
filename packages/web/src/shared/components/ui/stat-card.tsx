import { cn } from '@/shared/utils/cn'
import { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: LucideIcon
  iconColor?: string
  className?: string
}

export function StatCard({ title, value, subtitle, icon: Icon, iconColor = 'text-primary', className }: StatCardProps) {
  return (
    <div className={cn('rounded-lg border bg-card p-6 shadow-sm', className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
        <div className={cn('p-2 rounded-lg bg-muted', iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  )
}
