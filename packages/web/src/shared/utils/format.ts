export const formatCurrency = (value: number | string) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(value))

export const formatDate = (date: string | Date) =>
  new Intl.DateTimeFormat('pt-BR').format(new Date(date))

export const formatDateTime = (date: string | Date) =>
  new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(date))

export const masks = {
  cpf: (v: string) => v.replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4').slice(0, 14),
  phone: (v: string) => v.replace(/\D/g, '').replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3').slice(0, 15),
  cep: (v: string) => v.replace(/\D/g, '').replace(/(\d{5})(\d{3})/, '$1-$2').slice(0, 9),
}

export const SO_STATUS_LABELS: Record<string, string> = {
  AWAITING_DIAGNOSIS: 'Aguardando Diagnóstico',
  IN_REPAIR: 'Em Reparo',
  AWAITING_PART: 'Aguardando Peça',
  AWAITING_APPROVAL: 'Aguardando Aprovação',
  COMPLETED: 'Concluído',
  DELIVERED: 'Entregue',
  CANCELLED: 'Cancelado',
}

export const SO_STATUS_COLORS: Record<string, string> = {
  AWAITING_DIAGNOSIS: 'bg-yellow-100 text-yellow-800',
  IN_REPAIR: 'bg-blue-100 text-blue-800',
  AWAITING_PART: 'bg-orange-100 text-orange-800',
  AWAITING_APPROVAL: 'bg-purple-100 text-purple-800',
  COMPLETED: 'bg-green-100 text-green-800',
  DELIVERED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-red-100 text-red-800',
}

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pendente', CONFIRMED: 'Confirmado', DELIVERED: 'Entregue', CANCELLED: 'Cancelado',
}
