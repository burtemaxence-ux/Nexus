export const EMPLOYEE_DOCUMENTS_BUCKET = 'employee-documents'

export function isEmployeeDocumentPath(path: string, establishmentId: string, employeeId: string) {
  const [site, employee, filename, ...extra] = path.split('/')
  return site === establishmentId && employee === employeeId
    && /^[a-z0-9_-][a-z0-9._-]*$/i.test(filename ?? '') && extra.length === 0
}
