import isValidOktaOrgUrl from "./isValidOktaOrgUrl";

test("should return true for valid okta org url", () => {
  expect(isValidOktaOrgUrl("https://abc.okta.com/")).toEqual(true);
});

test("should return true for valid oktapreview org url", () => {
  expect(isValidOktaOrgUrl("https://abc.oktapreview.com/")).toEqual(true);
});

test("should return false for invalid okta org url", () => {
  expect(isValidOktaOrgUrl("https://abc.mochiokta.com/")).toEqual(false);
});

test("should return false for invalid oktapreview org url", () => {
  expect(isValidOktaOrgUrl("https://abc.sobaoktapreview.com/")).toEqual(false);
});

test("should throw for invalid oktapreview org url", () => {
  expect(isValidOktaOrgUrl("https://abc.sobaoktapreview.com/")).toEqual(false);
});

test("should return false for falsy org url", () => {
  expect(isValidOktaOrgUrl(undefined as any)).toEqual(false);
});
