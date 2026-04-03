
import React from 'react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface FooterProps {
  activeId: string;
  items: NavItem[];
  onSelect: (id: string) => void;
}

const Footer: React.FC<FooterProps> = ({ activeId, items, onSelect }) => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-xl border-t border-zinc-800 px-6 pb-6 pt-2 z-50 flex items-center justify-between safe-area-bottom">
      {items.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect(item.id)}
          className="flex flex-col items-center justify-center p-2 min-w-[64px]"
        >
          <div className={`p-2 rounded-xl transition-all duration-300 ${activeId === item.id ? 'bg-[#d64e02] text-white' : 'text-zinc-500'}`}>
            {item.icon}
          </div>
          <span className={`text-[10px] mt-1 ${activeId === item.id ? 'text-[#d64e02] font-bold' : 'text-zinc-500'}`}>
            {item.label}
          </span>
        </button>
      ))}
    </footer>
  );
};

export default Footer;
