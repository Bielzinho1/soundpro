import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Crown, Instagram, Loader2, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { BottomNav } from "@/components/BottomNav";

const WHATSAPP_LINK = "https://wa.me/5541992945393?text=Olá! Quero assinar o SoundPro Premium!";

const Profile = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;

    void supabase
      .from("profiles")
      .select("display_name, instagram, is_premium")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        setDisplayName(data?.display_name || "");
        setInstagram(data?.instagram || "");
        setIsPremium(Boolean(data?.is_premium));
        setLoading(false);
      });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);

    const handle = instagram.trim().replace(/^@+/, "");

    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() || null, instagram: handle || null })
      .eq("user_id", user.id);

    setSaving(false);

    if (error) {
      toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
      return;
    }

    toast({ title: "Perfil atualizado!" });
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-40">
      <header className="border-b border-border p-4">
        <h1 className="text-2xl font-bold text-foreground">Perfil</h1>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
      </header>

      <div className="space-y-5 p-4">
        <div className="space-y-2">
          <Label htmlFor="displayName">Nome de exibição</Label>
          <Input
            id="displayName"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Como quer ser chamado"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="instagram" className="flex items-center gap-2">
            <Instagram className="h-4 w-4" /> Instagram
          </Label>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">@</span>
            <Input
              id="instagram"
              value={instagram}
              onChange={(event) => setInstagram(event.target.value)}
              placeholder="seu.usuario"
            />
          </div>
          {instagram.trim() && (
            <a
              href={`https://instagram.com/${instagram.trim().replace(/^@+/, "")}`}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary"
            >
              Abrir perfil no Instagram
            </a>
          )}
        </div>

        <Button className="w-full" onClick={() => void save()} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Salvar
        </Button>

        <div className="space-y-2 rounded-xl border border-primary/30 bg-card p-4">
          <div className="flex items-center gap-2 text-primary">
            <Crown className="h-5 w-5" />
            <span className="font-semibold">{isPremium ? "Premium ativo" : "SoundPro Premium"}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Playlists salvas para ouvir offline, sem limites de criação com IA.
          </p>
          {!isPremium && (
            <Button className="w-full" onClick={() => navigate("/premium")}>
              Ser Premium · R$ 15,00/mês
            </Button>
          )}
          {!isPremium && (
            <Button
              variant="ghost"
              className="w-full text-xs text-muted-foreground"
              onClick={() => window.open(WHATSAPP_LINK, "_blank")}
            >
              Falar no WhatsApp
            </Button>
          )}
        </div>

        <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => void signOut()}>
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </div>

      <BottomNav />
    </div>
  );
};

export default Profile;
