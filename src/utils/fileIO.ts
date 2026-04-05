export function isPdfFile(file: File) {
  return file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
}

export async function readFileAsUint8Array(file: File) {
  const fileBuffer = await file.arrayBuffer();
  return new Uint8Array(fileBuffer);
}
