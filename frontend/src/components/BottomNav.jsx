import { useNavigate, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { icon: '🏠', label: 'Home', path: '/' },
  { icon: '📚', label: 'Library', path: '/library' },
  { icon: '🦸', label: 'Heroes', path: '/characters' },
  { icon: '⭐', label: 'Profile', path: '/profile' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(item => (
        <button
          key={item.path}
          className={`nav-item ${pathname === item.path ? 'active' : ''}`}
          onClick={() => navigate(item.path)}
        >
          <span className="nav-icon">{item.icon}</span>
          {item.label}
        </button>
      ))}
    </nav>
  );
}
