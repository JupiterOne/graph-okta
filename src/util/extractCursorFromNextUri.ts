import { URL } from "url";

/*
 * Extracts cursor 00ubfjQEMYBLRUWIEDKK from
 * https://lifeomic.okta.com/api/v1/users?after=00ubfjQEMYBLRUWIEDKK
 */
export default function extractCursorFromNextUri(
  nextUri: string | undefined,
): string | undefined {
  if (nextUri) {
    const url = new URL(nextUri);
    const after = url.searchParams.get("after");
    if (after) return after;
  }
}
