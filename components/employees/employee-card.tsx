import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface EmployeeCardProps {
  full_name: string
  email: string
  position: string | null
  created_at: string
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function EmployeeCard({ full_name, email, position, created_at }: EmployeeCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
          <span className="text-sm font-semibold text-green-700">
            {getInitials(full_name)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">{full_name}</p>
          <p className="text-xs text-gray-500 truncate">{email}</p>
        </div>
        <div className="flex flex-col items-end gap-1">
          {position && (
            <Badge variant="secondary" className="text-xs whitespace-nowrap">
              {position}
            </Badge>
          )}
          <span className="text-xs text-gray-400 whitespace-nowrap">
            Depuis le {formatDate(created_at)}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
