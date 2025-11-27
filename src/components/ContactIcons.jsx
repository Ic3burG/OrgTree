import { Mail, Phone, MapPin } from 'lucide-react';

/**
 * ContactIcons - Reusable component for displaying contact information icons
 * Shows email, phone, and location with tooltips and clickable links
 */
export default function ContactIcons({ email, phone, office, size = 'sm' }) {
  const iconSize = size === 'sm' ? 16 : 20;
  const buttonClass = `p-1.5 rounded-full hover:bg-slate-200 transition-colors ${
    size === 'sm' ? 'text-slate-600' : 'text-slate-700'
  }`;

  return (
    <div className="flex gap-1 items-center">
      {email && (
        <a
          href={`mailto:${email}`}
          className={buttonClass}
          title={`Email: ${email}`}
          aria-label={`Send email to ${email}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Mail size={iconSize} />
        </a>
      )}

      {phone && (
        <a
          href={`tel:${phone}`}
          className={buttonClass}
          title={`Phone: ${phone}`}
          aria-label={`Call ${phone}`}
          onClick={(e) => e.stopPropagation()}
        >
          <Phone size={iconSize} />
        </a>
      )}

      {office && (
        <button
          className={buttonClass}
          title={`Office: ${office}`}
          aria-label={`Office location: ${office}`}
          onClick={(e) => e.stopPropagation()}
          type="button"
        >
          <MapPin size={iconSize} />
        </button>
      )}
    </div>
  );
}
