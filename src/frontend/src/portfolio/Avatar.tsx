import { useState } from 'react';
import { initialsOf } from './helpers';

type Props = { name: string; photoUrl?: string | null; className?: string };

/** Profile photo; falls back to the initials if there is no photo or it fails to load. */
export default function Avatar({ name, photoUrl, className = '' }: Props) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showPhoto = Boolean(photoUrl) && failedUrl !== photoUrl;

  if (showPhoto) {
    return (
      <img
        src={photoUrl!}
        alt={`Foto di ${name}`}
        width={448}
        height={448}
        decoding="async"
        referrerPolicy="no-referrer"
        onError={() => setFailedUrl(photoUrl ?? null)}
        className={`object-cover ${className}`}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className={`flex items-center justify-center bg-gradient-to-br from-brand-500 to-brand-800 font-black tracking-tight text-white ${className}`}
    >
      <span className="text-6xl">{initialsOf(name)}</span>
    </div>
  );
}
