const clientToken = import.meta.env.VITE_PAYMENTS_CLIENT_TOKEN;

export function PaymentTestModeBanner() {
  if (!clientToken) {
    return (
      <div className="w-full bg-destructive/15 border-b border-destructive/40 px-4 py-2 text-center text-xs text-destructive">
        Pagamento por cartão ainda não está ativo nesta versão. Use o Pix abaixo.
      </div>
    );
  }
  if (clientToken.startsWith("pk_test_")) {
    return (
      <div className="w-full bg-amber-500/15 border-b border-amber-500/40 px-4 py-2 text-center text-xs text-amber-500">
        Pagamentos no preview estão em modo de teste (nenhuma cobrança real).
      </div>
    );
  }
  return null;
}
