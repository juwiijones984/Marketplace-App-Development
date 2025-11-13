import { Link } from 'react-router-dom';
import logoImage from 'figma:asset/0e288c27a32dff26af22d9e012c3c0cf9a39abb6.png';

interface LogoHeaderProps {
  to?: string;
  className?: string;
  showText?: boolean;
}

export function LogoHeader({ to = '/', className = 'h-12', showText = false }: LogoHeaderProps) {
  return (
    <Link to={to} className="flex items-center gap-3">
      <img src={logoImage} alt="SA Market Logo" className={className} />
      {showText && <span className="text-xl font-semibold">South Africa Market</span>}
    </Link>
  );
}
