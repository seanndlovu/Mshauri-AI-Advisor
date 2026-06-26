export function maskSensitive(text: string): string {
  return text
    .replace(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g, (email) => {
      const [local, domain] = email.split("@");
      const visible = local.slice(0, 2);
      return `${visible}***@${domain}`;
    })
    .replace(/\d{7,}/g, (num) => {
      const first = num.slice(0, 3);
      const last = num.slice(-3);
      return `${first}•••••${last}`;
    });
}
