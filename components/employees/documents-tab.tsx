'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Upload, Trash2, Download, FileText, FileImage,
  File, Loader2, Plus, X,
} from 'lucide-react'
import type { EmployeeDocument, DocumentType } from '@/types'

const DOC_TYPES: { value: DocumentType; label: string }[] = [
  { value: 'contract', label: 'Contrat signé' },
  { value: 'id',       label: "Pièce d'identité" },
  { value: 'payslip',  label: 'Bulletin de salaire' },
  { value: 'medical',  label: 'Certificat médical' },
  { value: 'other',    label: 'Autre document' },
]

function docTypeLabel(t: DocumentType): string {
  return DOC_TYPES.find(d => d.value === t)?.label ?? 'Document'
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function FileIcon({ mimeType }: { mimeType: string }) {
  if (mimeType.startsWith('image/')) return <FileImage className="h-4 w-4" />
  if (mimeType === 'application/pdf') return <FileText className="h-4 w-4" />
  return <File className="h-4 w-4" />
}

interface UploadPanelProps {
  employeeId: string
  onUploaded: () => void
  onCancel: () => void
}

function UploadPanel({ employeeId, onUploaded, onCancel }: UploadPanelProps) {
  const [file, setFile] = useState<File | null>(null)
  const [docType, setDocType] = useState<DocumentType>('other')
  const [customName, setCustomName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function pickFile(f: File | null) {
    if (!f) return
    setFile(f)
    if (!customName) setCustomName(f.name.replace(/\.[^.]+$/, ''))
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragOver(false)
    pickFile(e.dataTransfer.files[0] ?? null)
  }

  async function handleUpload() {
    if (!file) return
    setUploading(true)
    setError(null)

    const form = new FormData()
    form.append('file', file)
    form.append('document_type', docType)
    form.append('name', customName.trim() || file.name)

    const res = await fetch(`/api/employees/${employeeId}/documents`, {
      method: 'POST',
      body: form,
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? 'Erreur lors de l\'upload')
      setUploading(false)
      return
    }

    onUploaded()
  }

  return (
    <div style={{
      borderRadius: '12px',
      border: '0.5px solid var(--accent)',
      backgroundColor: 'var(--accent-light)',
      padding: '20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>Ajouter un document</p>
        <button onClick={onCancel} style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}>
          <X size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* File picker with drag & drop */}
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          style={{
            borderRadius: '8px',
            border: `1.5px dashed ${isDragOver ? 'var(--accent)' : file ? 'var(--accent)' : 'var(--border)'}`,
            backgroundColor: isDragOver ? 'var(--accent-light)' : file ? 'rgba(45,58,140,0.04)' : 'var(--bg-card)',
            padding: '20px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'border-color 150ms, background-color 150ms',
          }}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
            onChange={e => pickFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <div>
              <FileText size={20} style={{ color: 'var(--accent)', margin: '0 auto 6px' }} />
              <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>{file.name}</p>
              <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>{formatSize(file.size)}</p>
            </div>
          ) : (
            <div>
              <Upload size={20} style={{ color: isDragOver ? 'var(--accent)' : 'var(--text-tertiary)', margin: '0 auto 8px' }} />
              <p style={{ fontSize: '13px', color: isDragOver ? 'var(--accent)' : 'var(--text-secondary)' }}>
                {isDragOver ? 'Déposez le fichier ici' : 'Glissez un fichier ou cliquez pour parcourir'}
              </p>
              <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>PDF, Word, image — max 20 Mo</p>
            </div>
          )}
        </div>

        {/* Type selector */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
              Type
            </label>
            <select
              value={docType}
              onChange={e => setDocType(e.target.value as DocumentType)}
              style={{
                width: '100%', padding: '7px 10px', fontSize: '13px',
                borderRadius: '8px', border: '0.5px solid var(--border)',
                backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)',
                outline: 'none',
              }}
            >
              {DOC_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: '4px' }}>
              Nom
            </label>
            <input
              type="text"
              value={customName}
              onChange={e => setCustomName(e.target.value)}
              placeholder="Nom du document"
              style={{
                width: '100%', padding: '7px 10px', fontSize: '13px',
                borderRadius: '8px', border: '0.5px solid var(--border)',
                backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)',
                outline: 'none', boxSizing: 'border-box',
              }}
            />
          </div>
        </div>

        {error && (
          <p style={{ fontSize: '12px', color: 'var(--danger)' }}>{error}</p>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '9px 20px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
            backgroundColor: file && !uploading ? 'var(--accent)' : 'var(--border)',
            color: file && !uploading ? '#FFFFFF' : 'var(--text-tertiary)',
            border: 'none', cursor: file && !uploading ? 'pointer' : 'not-allowed',
            transition: 'background-color 150ms',
          }}
        >
          {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {uploading ? 'Envoi en cours…' : 'Envoyer'}
        </button>
      </div>
    </div>
  )
}

interface DocumentsTabProps {
  employeeId: string
}

export function DocumentsTab({ employeeId }: DocumentsTabProps) {
  const [docs, setDocs] = useState<EmployeeDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<DocumentType | 'all'>('all')

  const loadDocs = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/employees/${employeeId}/documents`)
    if (res.ok) setDocs(await res.json())
    setLoading(false)
  }, [employeeId])

  useEffect(() => { loadDocs() }, [loadDocs])

  async function handleDelete(docId: string) {
    setDeleting(docId)
    await fetch(`/api/employees/${employeeId}/documents/${docId}`, { method: 'DELETE' })
    setDocs(prev => prev.filter(d => d.id !== docId))
    setDeleting(null)
  }

  const filtered = filterType === 'all' ? docs : docs.filter(d => d.document_type === filterType)

  return (
    <div style={{ maxWidth: '800px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)' }}>Documents RH</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            Contrats signés, pièces d&apos;identité, bulletins de salaire et justificatifs.
          </p>
        </div>
        {!showUpload && (
          <button
            onClick={() => setShowUpload(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
              backgroundColor: 'var(--accent)', color: '#FFFFFF',
              border: 'none', cursor: 'pointer',
            }}
          >
            <Plus size={14} />
            Ajouter
          </button>
        )}
      </div>

      {/* Upload panel */}
      {showUpload && (
        <div style={{ marginBottom: '20px' }}>
          <UploadPanel
            employeeId={employeeId}
            onUploaded={() => { setShowUpload(false); loadDocs() }}
            onCancel={() => setShowUpload(false)}
          />
        </div>
      )}

      {/* Filter pills */}
      {docs.length > 0 && (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {[{ value: 'all' as const, label: 'Tous' }, ...DOC_TYPES].map(t => (
            <button
              key={t.value}
              onClick={() => setFilterType(t.value)}
              style={{
                padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 500,
                border: '0.5px solid ' + (filterType === t.value ? 'var(--accent)' : 'var(--border)'),
                backgroundColor: filterType === t.value ? 'var(--accent-light)' : 'transparent',
                color: filterType === t.value ? 'var(--accent)' : 'var(--text-secondary)',
                cursor: 'pointer', transition: 'all 150ms',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Document list */}
      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div style={{
          borderRadius: '12px', border: '0.5px dashed var(--border)',
          padding: '48px 24px', textAlign: 'center',
        }}>
          <File size={32} style={{ color: 'var(--text-tertiary)', margin: '0 auto 12px', opacity: 0.4 }} />
          <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
            {filterType === 'all' ? 'Aucun document' : `Aucun document de type "${docTypeLabel(filterType as DocumentType)}"`}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {filterType === 'all' ? "Cliquez sur \"Ajouter\" pour importer le premier document." : 'Essayez un autre filtre.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {filtered.map(doc => (
            <div
              key={doc.id}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '14px 16px',
                borderRadius: '10px',
                border: '0.5px solid var(--border)',
                backgroundColor: 'var(--bg-card)',
              }}
            >
              {/* Icon */}
              <div style={{
                width: '36px', height: '36px', borderRadius: '8px', flexShrink: 0,
                backgroundColor: 'var(--accent-light)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent)',
              }}>
                <FileIcon mimeType={doc.mime_type} />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {doc.name}
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '4px', backgroundColor: 'var(--accent-light)', color: 'var(--accent)', fontWeight: 500 }}>
                    {docTypeLabel(doc.document_type)}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{formatSize(doc.file_size)}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{formatDate(doc.created_at)}</span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                {doc.url && (
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    download={doc.name}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '32px', height: '32px', borderRadius: '6px',
                      border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)',
                      color: 'var(--text-secondary)', textDecoration: 'none',
                      transition: 'background-color 150ms',
                    }}
                    title="Télécharger"
                  >
                    <Download size={13} />
                  </a>
                )}

                {confirmDelete === doc.id ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>Supprimer ?</span>
                    <button
                      onClick={() => { setConfirmDelete(null); handleDelete(doc.id) }}
                      disabled={deleting === doc.id}
                      style={{
                        padding: '3px 8px', borderRadius: '5px', fontSize: '11px', fontWeight: 600,
                        backgroundColor: 'var(--danger)', color: '#fff',
                        border: 'none', cursor: 'pointer',
                      }}
                    >
                      {deleting === doc.id ? <Loader2 size={11} className="animate-spin" /> : 'Oui'}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      style={{
                        padding: '3px 8px', borderRadius: '5px', fontSize: '11px',
                        border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)',
                        color: 'var(--text-secondary)', cursor: 'pointer',
                      }}
                    >
                      Non
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(doc.id)}
                    disabled={deleting === doc.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: '32px', height: '32px', borderRadius: '6px',
                      border: '0.5px solid var(--border)', backgroundColor: 'var(--bg-page)',
                      color: 'var(--danger)',
                      cursor: 'pointer',
                      transition: 'all 150ms',
                    }}
                    title="Supprimer"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
