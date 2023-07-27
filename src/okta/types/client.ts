export interface OktaCollection<T> {
  /**
   * The unprocessed items of the collection, reduced by one during the
   * iteration of `each`. When this reaches `length === 0`, another page will be
   * fetched. The `each(cb)` should return `false` to avoid fetching another
   * page.
   */
  currentItems: T[];

  /**
   * The initial URI of the resource collection, or the `next` rel link provided
   * in the response, which may be `undefined`. After the first request, if this
   * is `undefined`, it means there is are no more pages to fetch.
   */
  nextUri?: string;

  each: (cb: (item: T) => void) => Promise<void>;
}

export interface OktaQueryParams {
  q?: string;
  after?: string;
  limit?: string;
  filter?: string;
  format?: string;
  search?: string;
  since?: string;
  expand?: string;
}
