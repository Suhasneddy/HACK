// Gmail send/draft needs base64url-encoded RFC 2822 message (NOT plain text). Backend can reuse.
const clean = (s) => { if (/[\r\n]/.test(s)) throw new Error("header injection: CR/LF in header"); return s; };
const encHeader = (s) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${Buffer.from(s, "utf8").toString("base64")}?=`);
export function buildRawMime({ from, to, subject, body, inReplyTo, references }) {
  const h = [`From: ${clean(from)}`, `To: ${clean(to)}`, `Subject: ${encHeader(clean(subject))}`, "MIME-Version: 1.0", "Content-Type: text/plain; charset=UTF-8", "Content-Transfer-Encoding: 8bit"];
  if (inReplyTo) h.push(`In-Reply-To: ${clean(inReplyTo)}`);
  if (references) h.push(`References: ${clean(references)}`);
  return h.join("\r\n") + "\r\n\r\n" + body;
}
export const toBase64Url = (s) => Buffer.from(s, "utf8").toString("base64url");
export const fromBase64Url = (s) => Buffer.from(s, "base64url").toString("utf8");
