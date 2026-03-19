import { useNavigate, useLocation } from "react-router-dom";
import { Home, Search, Library, Crown } from "lucide-react";

const WHATSAPP_LINK = "https://wa.me/5541992945393?text=Olá! Quero assinar o SoundPro Premium!";

const navItems = [
  { icon: Home, label: "Início", path: "/" },
  { icon: Search, label: "Buscar", path: "/search" },
  { icon: Library, label: "Biblioteca", path: "/dashboard" },
  { icon: Crown, label: "Premium", path: "premium" },
];

export const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around py-2 px-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = item.path === "premium" ? false : location.pathname === item.path;
          const isPremium = item.path === "premium";

          return (
            <button
              key={item.label}
              onClick={() => {
                if (isPremium) {
                  window.open(WHATSAPP_LINK, "_blank");
                } else {
                  navigate(item.path);
                }
              }}
              className={`flex flex-col items-center gap-0.5 py-1 px-3 rounded-lg transition-colors ${
                isActive
                  ? "text-foreground"
                  : isPremium
                  ? "text-primary"
                  : "text-muted-foreground"
              }`}
            >
              <item.icon className={`w-6 h-6 ${isActive ? "text-foreground" : ""}`} />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
