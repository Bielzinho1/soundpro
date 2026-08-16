import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy, CreditCard, Crown, Loader2, QrCode, Upload } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { usePremium } from "@/hooks/usePremium";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { BottomNav } from "@/components/BottomNav";
import { PaymentTestModeBanner } from "@/components/PaymentTestModeBanner";
import { StripeEmbeddedCheckout } from "@/components/StripeEmbeddedCheckout";
import { isPaymentsConfigured } from "@/lib/stripe";
import { buildPixPayload, PIX_KEY, PIX_RECEIVER, PREMIUM_PRICE_CENTS } from "@/lib/pix";

const BENEFITS = [
  "Playlists ilimitadas e compartilháveis",
  "Modo offline nas playlists salvas",
  "Letras traduzidas com IA",
  "Jogo Piano Tiles com qualquer música",
  "Áudio na melhor qualidade disponível",
];

type PixPayment = {
  id: string;
  status: string;
  created_at: string;
};

const Premium = () => {
  const { user, loading: authLoading } = useAuth();
  const { isPremium, refresh } = usePremium();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showCheckout, setShowCheckout] = useState(false);
  const [copied, setCopied] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pixPayments, setPixPayments] = useState<PixPayment[]>([]);

  const pixCode = useMemo(() => buildPixPayload(PREMIUM_PRICE_CENTS), []);
  const cardEnabled = isPaymentsConfigured();

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
  }, [authLoading, user, navigate]);

  const loadPix = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("pix_payments")
      .select("id, status, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setPixPayments(data ?? []);
  };

  useEffect(() => {
    void loadPix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  useEffect(() => {
    if (searchParams.get("session_id")) {
      toast({
        title: "Pagamento recebido!",
        description: "Seu Premium é liberado automaticamente em alguns segundos.",
      });
      const t = setInterval(() => void refresh(), 3000);
      return () => clearInterval(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const copyPix = async () => {
    await navigator.clipboard.writeText(pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    toast({ title: "Código Pix copiado!", description: "Cole no app do seu banco." });
  };

  const sendProof = async (file: File) => {
    if (!user) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("pix-proofs")
      .upload(path, file, { upsert: false });

    if (uploadError) {
      setUploading(false);
      toast({ variant: "destructive", title: "Erro no envio", description: uploadError.message });
      return;
    }

    const { error } = await supabase.from("pix_payments").insert({
      user_id: user.id,
      amount_cents: PREMIUM_PRICE_CENTS,
      status: "pending",
      proof_url: path,
    });

    setUploading(false);

    if (error) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
      return;
    }

    toast({
      title: "Comprovante enviado!",
      description: "Assim que for aprovado, o Premium é liberado.",
    });
    void loadPix();
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <PaymentTestModeBanner />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <header className="text-center space-y-2">
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/15 flex items-center justify-center">
            <Crown className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">SoundPro Premium</h1>
          <p className="text-muted-foreground text-sm">R$ 15,00 por mês · cancele quando quiser</p>
        </header>

        {isPremium ? (
          <div className="rounded-xl border border-primary/40 bg-primary/10 p-5 text-center space-y-2">
            <Crown className="w-8 h-8 text-primary mx-auto" />
            <p className="font-semibold">Você já é Premium 🎉</p>
            <p className="text-sm text-muted-foreground">Todos os benefícios estão liberados.</p>
          </div>
        ) : (
          <>
            <ul className="space-y-2 rounded-xl border border-border bg-card p-4">
              {BENEFITS.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm">
                  <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>

            <Tabs defaultValue={cardEnabled ? "card" : "pix"}>
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="card">
                  <CreditCard className="w-4 h-4 mr-2" /> Cartão
                </TabsTrigger>
                <TabsTrigger value="pix">
                  <QrCode className="w-4 h-4 mr-2" /> Pix
                </TabsTrigger>
              </TabsList>

              <TabsContent value="card" className="pt-4 space-y-3">
                {!cardEnabled ? (
                  <p className="text-sm text-muted-foreground">
                    O pagamento com cartão será liberado assim que o app for publicado. Enquanto
                    isso, use o Pix.
                  </p>
                ) : showCheckout ? (
                  <StripeEmbeddedCheckout
                    priceId="premium_monthly"
                    customerEmail={user?.email ?? undefined}
                    userId={user?.id}
                    returnUrl={`${window.location.origin}/premium?session_id={CHECKOUT_SESSION_ID}`}
                  />
                ) : (
                  <>
                    <p className="text-sm text-muted-foreground">
                      Pague com cartão de crédito e o Premium é liberado automaticamente na hora.
                    </p>
                    <Button className="w-full" size="lg" onClick={() => setShowCheckout(true)}>
                      Assinar com cartão · R$ 15,00/mês
                    </Button>
                  </>
                )}
              </TabsContent>

              <TabsContent value="pix" className="pt-4 space-y-4">
                <div className="rounded-xl border border-border bg-card p-4 space-y-3 text-center">
                  <div className="bg-white p-3 rounded-lg inline-block">
                    <QRCodeSVG value={pixCode} size={168} />
                  </div>
                  <div className="text-sm">
                    <p className="text-muted-foreground">Chave Pix (CPF)</p>
                    <p className="font-semibold">{PIX_KEY}</p>
                    <p className="text-muted-foreground">{PIX_RECEIVER}</p>
                    <p className="font-semibold mt-1">R$ 15,00</p>
                  </div>
                  <Button variant="secondary" className="w-full" onClick={copyPix}>
                    <Copy className="w-4 h-4 mr-2" />
                    {copied ? "Copiado!" : "Copiar código Pix"}
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="proof">Enviar comprovante</Label>
                  <Input
                    id="proof"
                    type="file"
                    accept="image/*,application/pdf"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void sendProof(file);
                      e.target.value = "";
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Depois de pagar, envie o comprovante. A aprovação leva poucos minutos e o
                    Premium é liberado automaticamente.
                  </p>
                  {uploading && (
                    <p className="text-xs flex items-center gap-2 text-muted-foreground">
                      <Loader2 className="w-3 h-3 animate-spin" /> Enviando...
                    </p>
                  )}
                </div>

                {pixPayments.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Seus envios</p>
                    {pixPayments.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2 text-sm"
                      >
                        <span className="text-muted-foreground">
                          {new Date(p.created_at).toLocaleString("pt-BR")}
                        </span>
                        <span
                          className={
                            p.status === "approved"
                              ? "text-primary font-medium"
                              : p.status === "rejected"
                                ? "text-destructive font-medium"
                                : "text-muted-foreground"
                          }
                        >
                          {p.status === "approved"
                            ? "Aprovado"
                            : p.status === "rejected"
                              ? "Recusado"
                              : "Em análise"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default Premium;
