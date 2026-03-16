import Link from 'next/link'

export function LogoLink() {
  return (
    <Link href="/">
      <h1
        className="text-2xl tracking-tight text-orange-500"
        style={{ fontFamily: 'var(--font-logo)' }}
      >
        nyam
      </h1>
    </Link>
  )
}
