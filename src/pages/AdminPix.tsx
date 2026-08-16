import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, ExternalLink, Loader2, ShieldCheck, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { BottomNav } from "@/components/BottomNav";

type PixRow = {
  id: string;
  user_id: string;
  amount_cents: number;
  status: string;
  proof_url: string | null;
  created_at: string;
};

const AdminPix = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [rows, setRows] = useState<PixRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    void supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(Boolean(data)));
  }, [user]);

  const load = async () => {
    const { data } = await supabase
      .from("pix_payments")
      .select("id, user_id, amount_cents, status, proof_url, created_at")
      .order("created_at", { ascending: false });
    setRows((data as PixRow[]) ?? []);
  };

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin]);

  const openProof = async (path: string) => {
    const { data } = await supabase.storage.from("pix-proofs").createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const review = async (row: PixRow, status: "approved" | "rejected") => {
    setBusy(row.id);
    const expires = new Date();
    expires.setMonth(expires.getMonth() + 1);

    const { error } = await supabase
      .from("pix_payments")
      .update({
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id,
        expires_at: status === "approved" ? expires.toISOString() : null,
      })
      .eq("id", row.id);

    setBusy(null);

    if (error) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
      return;
    }
    toast({
      title: status === "approved" ? "Premium liberado!" : "Pagamento recusado",
    });
    void load();
  };

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-background px-6 text-center">
        <ShieldCheck className="w-10 h-10 text-muted-foreground" />
        <p className="text-muted-foreground">Esta área é só para administradores.</p>
        <Button onClick={() => navigate("/")}>Voltar ao início</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <h1 className="text-2xl font-bold">Aprovar Pix</h1>

        {rows.length === 0 && (
          <p className="text-muted-foreground text-sm">Nenhum comprovante enviado ainda.</p>
        )}

        {rows.map((row) => (
          <div key={row.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">
                R$ {(row.amount_cents / 100).toFixed(2).replace(".", ",")}
              </span>
              <span className="text-muted-foreground">
                {new Date(row.created_at).toLocaleString("pt-BR")}
              </span>
            </div>
            <p className="text-xs text-muted-foreground break-all">Usuário: {row.user_id}</p>

            {row.proof_url && (
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => void openProof(row.proof_url!)}
              >
                <ExternalLink className="w-4 h-4 mr-2" /> Ver comprovante
              </Button>
            )}

            {row.status === "pending" ? (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  disabled={busy === row.id}
                  onClick={() => void review(row, "approved")}
                >
                  <Check className="w-4 h-4 mr-1" /> Aprovar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busy === row.id}
                  onClick={() => void review(row, "rejected")}
                >
                  <X className="w-4 h-4 mr-1" /> Recusar
                </Button>
              </div>
            ) : (
              <p
                className={`text-sm font-medium ${
                  row.status === "approved" ? "text-primary" : "text-destructive"
                }`}
              >
                {row.status === "approved" ? "Aprovado" : "Recusado"}
              </p>
            )}
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  );
};

export default AdminPix;
