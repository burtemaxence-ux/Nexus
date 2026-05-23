import { redirect } from 'next/navigation'
export default function EditRedirect({ params }: { params: { id: string } }) {
  redirect(`/manager/employees/${params.id}`)
}
