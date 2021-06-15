import isValidOktaOrgUrl from './isValidOktaOrgUrl';

for (const url of [
  'https://abc.okta.com/',
  'https://abc.oktapreview.com/',
  'https://abc.okta-emea.com',
]) {
  test(`valid okta org url: ${url}`, () => {
    expect(isValidOktaOrgUrl(url)).toEqual(true);
  });
}

for (const url of [
  'https://abc.mochiokta.com/',
  'https://abc.sobaoktapreview.com/',
  'https://abc.cookieokta-emea.com',
  'https://anything.custom.com',
]) {
  test(`invalid okta org url: ${url}`, () => {
    expect(isValidOktaOrgUrl(url)).toEqual(false);
  });
}

test('falsy org url', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  expect(isValidOktaOrgUrl(undefined as any)).toEqual(false);
});
