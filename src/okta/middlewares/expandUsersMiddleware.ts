import { Middleware } from '@okta/okta-sdk-nodejs/src/types/generated/middleware';
import { from } from '@okta/okta-sdk-nodejs/src/generated/rxjsStub';

export const expandUsersMiddleware: Middleware = {
  pre: (context) => {
    return from(
      new Promise((resolve) => {
        context.setQueryParam('expand', 'user');
        resolve(context);
      }),
    );
  },
  post: (context) => {
    return from(new Promise((resolve) => resolve(context)));
  },
};
