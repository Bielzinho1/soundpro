export const PIX_KEY = "15550193906";
export const PIX_RECEIVER = "Vitor Gabriel Gomes Nieto";
export const PIX_CITY = "SAO PAULO";
export const PREMIUM_PRICE_CENTS = 1500;

function field(id: string, value: string) {
  const size = value.length.toString().padStart(2, "0");
  return `${id}${size}${value}`;
}

function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function sanitize(value: string, max: number) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9 ]/g, "")
    .toUpperCase()
    .slice(0, max);
}

/** Gera o código Pix copia e cola (BR Code estático). */
export function buildPixPayload(amountCents: number, txid = "SOUNDPRO"): string {
  const amount = (amountCents / 100).toFixed(2);

  const merchantAccount = field("00", "br.gov.bcb.pix") + field("01", PIX_KEY);

  let payload =
    field("00", "01") +
    field("26", merchantAccount) +
    field("52", "0000") +
    field("53", "986") +
    field("54", amount) +
    field("58", "BR") +
    field("59", sanitize(PIX_RECEIVER, 25)) +
    field("60", sanitize(PIX_CITY, 15)) +
    field("62", field("05", sanitize(txid, 25) || "***"));

  payload += "6304";
  return payload + crc16(payload);
}
