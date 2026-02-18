export function validateDocumentURL(url: string): {
  docType: string;
  docToken: string;
} {
  const pattern = /^https:\/\/[\w-.]+\/(docs|docx|wiki)\/([a-zA-Z0-9]+)/;
  const match = url.match(pattern);
  if (!match || match.length !== 3) {
    throw new Error("Invalid feishu/larksuite document URL");
  }
  return { docType: match[1], docToken: match[2] };
}

export function unescapeURL(rawURL: string): string {
  try {
    return decodeURIComponent(rawURL);
  } catch {
    return rawURL;
  }
}
