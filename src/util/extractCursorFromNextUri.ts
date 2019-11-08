import { URL } from "url";

/*
 * Extracts cursor 00ubfjQEMYBLRUWIEDKK from
 * https://lifeomic.okta.com/api/v1/users?after=00ubfjQEMYBLRUWIEDKK
 */
export default function extractCursorFromNextUri(
  nextUri: string | undefined,
): string | null | undefined {
  if (nextUri) {
    const url = new URL(nextUri);
    return url.searchParams.get("after");
  }
}
