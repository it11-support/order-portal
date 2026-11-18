import { Check, Copy, Eye, EyeOff } from 'lucide-react'
import { useState } from 'react'

const CustomerCredentials = ({
  username,
  password,
}: {
  username: string
  password?: string | null
}) => {
  const [visible, setVisible] = useState(false)
  const [copied, setCopied] = useState(false)
  const [usernameCopied, setUsernameCopied] = useState(false)
  const [copyError, setCopyError] = useState('')

  const copyPassword = async () => {
    if (!password) return
    setCopyError('')
    try {
      await navigator.clipboard.writeText(password)
      setCopied(true)
    } catch {
      setCopyError('Gagal menyalin. Silakan salin password secara manual.')
    }
  }

  const copyUsername = async () => {
    setCopyError('')
    try {
      await navigator.clipboard.writeText(username)
      setUsernameCopied(true)
    } catch {
      setCopyError('Gagal menyalin username secara manual.')
    }
  }

  return (
    <div>
      <div className="mb-1 flex items-center gap-2">
        <span>
          Username: <code className="font-mono font-semibold select-all">{username || '-'}</code>
        </span>
        {username && (
          <button
            type="button"
            aria-label={usernameCopied ? 'Username tersalin' : 'Salin username'}
            title={usernameCopied ? 'Username tersalin' : 'Salin username'}
            onClick={copyUsername}
            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            {usernameCopied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
          </button>
        )}
        <span role="status" className="sr-only">
          {usernameCopied ? 'Username tersalin' : ''}
        </span>
      </div>
      {password ? (
        <div className="flex items-center gap-2">
          <span>
            Password:{' '}
            <code className={`font-mono font-semibold ${visible ? 'select-all' : ''}`}>
              {visible ? password : '••••••'}
            </code>
          </span>
          <button
            type="button"
            aria-label={visible ? 'Sembunyikan password' : 'Lihat password'}
            title={visible ? 'Sembunyikan password' : 'Lihat password'}
            aria-pressed={visible}
            className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-2 focus-visible:outline-blue-600"
            onClick={() => {
              setVisible(!visible)
              setCopied(false)
              setCopyError('')
            }}
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          {visible && (
            <button
              type="button"
              aria-label={copied ? 'Password tersalin' : 'Salin password'}
              title={copied ? 'Password tersalin' : 'Salin password'}
              onClick={copyPassword}
              className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-gray-800 focus-visible:outline-2 focus-visible:outline-blue-600"
            >
              {copied ? <Check size={16} className="text-green-600" /> : <Copy size={16} />}
            </button>
          )}
          <span role="status" className="sr-only">
            {visible && copied ? 'Password tersalin' : ''}
          </span>
        </div>
      ) : (
        <span className="text-gray-500">
          Password lama tidak tersedia. Nonaktifkan lalu aktifkan kembali untuk membuat password
          baru.
        </span>
      )}
      {copyError && (
        <p role="alert" className="mt-1 text-red-600">
          {copyError}
        </p>
      )}
    </div>
  )
}

export default CustomerCredentials
