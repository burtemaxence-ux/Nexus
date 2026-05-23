import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { UserPlus, Users, Pencil } from 'lucide-react'
import DeleteEmployeeButton from './delete-employee-button'
import ResendLinkButton from './resend-link-button'

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2)
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function EmployeesPage({ searchParams }: { searchParams: { success?: string } }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: employees, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, position, contract_type, weekly_hours, created_at')
    .eq('role', 'employee')
    .order('created_at', { ascending: false })

  if (error) console.error('Erreur chargement employés:', error)
  const employeeList = employees ?? []

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/manager" className="text-sm text-gray-500 hover:text-gray-700">Tableau de bord</Link>
            <span className="text-gray-400">/</span>
            <span className="text-sm text-gray-700 font-medium">Équipe</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Équipe</h1>
          <p className="text-gray-500 mt-1">{employeeList.length} employé{employeeList.length !== 1 ? 's' : ''}</p>
        </div>
        <Button asChild>
          <Link href="/manager/employees/new">
            <UserPlus className="h-4 w-4 mr-2" />Inviter un employé
          </Link>
        </Button>
      </div>

      {searchParams.success === '1' && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          L&apos;invitation a été envoyée. L&apos;employé recevra un email pour définir son mot de passe.
        </div>
      )}
      {searchParams.success === '2' && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          Les informations ont été mises à jour avec succès.
        </div>
      )}

      {employeeList.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Aucun employé pour l&apos;instant</h2>
          <p className="text-gray-500 text-sm max-w-sm mb-6">Invitez votre premier employé en cliquant sur le bouton ci-dessus.</p>
          <Button asChild>
            <Link href="/manager/employees/new"><UserPlus className="h-4 w-4 mr-2" />Inviter un employé</Link>
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Employé</TableHead>
                <TableHead>Poste</TableHead>
                <TableHead>Contrat</TableHead>
                <TableHead>H/sem.</TableHead>
                <TableHead>Arrivée</TableHead>
                <TableHead className="pr-6"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employeeList.map((employee) => (
                <TableRow key={employee.id}>
                  <TableCell className="pl-6">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-green-700">
                          {getInitials(employee.full_name ?? employee.email ?? '?')}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{employee.full_name ?? '—'}</p>
                        <p className="text-xs text-gray-400">{employee.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {employee.position ? <Badge variant="secondary">{employee.position}</Badge> : <span className="text-gray-400 text-sm">—</span>}
                  </TableCell>
                  <TableCell>
                    {employee.contract_type ? <Badge variant="outline">{employee.contract_type}</Badge> : <span className="text-gray-400 text-sm">—</span>}
                  </TableCell>
                  <TableCell className="text-gray-600 text-sm">
                    {employee.weekly_hours ? `${employee.weekly_hours}h` : '—'}
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm">{formatDate(employee.created_at)}</TableCell>
                  <TableCell className="pr-6">
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/manager/employees/${employee.id}`}>
                          <Pencil className="h-3.5 w-3.5 mr-1" />Modifier
                        </Link>
                      </Button>
                      <ResendLinkButton employee={employee} />
                      <DeleteEmployeeButton employee={employee} />
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
